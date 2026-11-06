import { authenticatedRequest } from "../../services/apiAuth.service";
import { ApiError } from "../../../shared/api/http";
import type { Acceptance, Allocation, ApiOrder, Fulfillment, OrderPage, Separation } from "./contracts";
import { acceptanceOpen, assertQuantity, cents } from "./orderAdapter";

export function orderError(error: unknown): string {
    if (error instanceof ApiError) {
        const messages: Record<number, string> = {
            400: "Solicitação inválida. Revise os dados da operação.",
            401: "Sessão expirada. Entre novamente.",
            403: "Sem autorização para consultar ou alterar estes pedidos.",
            404: "Pedido ou lote não encontrado para esta organização.",
            409: "Conflito de versão ou operação indisponível. Atualize os dados e revise antes de confirmar novamente.",
            422: "Quantidades ou campos inválidos. Revise os limites e todas as linhas obrigatórias.",
        };
        return messages[error.status] ?? error.message;
    }
    return error instanceof Error ? error.message : "Não foi possível consultar os pedidos.";
}
export type OrdersState = { orders: ApiOrder[]; loading: boolean; error: string | null; loaded: boolean };
type Transport = <T>(path: string, options?: RequestInit) => Promise<T>;

// Uma instância por sessão/organização, compartilhada por menu, dashboard e Kanban.
// Nenhum dado de pedido ou chave de idempotência é persistido no navegador.
export class OrdersRepository {
    private state: OrdersState = { orders: [], loading: true, error: null, loaded: false };
    private listeners = new Set<() => void>();
    private loading: Promise<void> | null = null;
    private attempts = new Map<string, string>();
    private details = new Map<string, Promise<ApiOrder>>();
    private pending = new Set<string>();
    private enabled = true;
    private organizationId: string;
    private transport: Transport;
    constructor(organizationId: string, transport: Transport = authenticatedRequest) {
        this.organizationId = organizationId;
        this.transport = transport;
    }
    activate() { this.enabled = true; }
    deactivate() { this.enabled = false; }
    snapshot = () => this.state;
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    private publish(state: OrdersState) {
        if (!this.enabled) return;
        this.state = state;
        this.listeners.forEach(listener => listener());
    }
    private headers() { return { "X-Organization-Id": this.organizationId }; }
    private check(order: ApiOrder) {
        if (order.supplier_organization_id !== this.organizationId) throw new Error("A API retornou um pedido de outra organização.");
        cents(order.total);
        order.items.forEach(item => cents(item.unit_price));
        return order;
    }
    refresh = (): Promise<void> => {
        if (this.loading) return this.loading;
        if (!this.enabled) return Promise.resolve();
        this.publish({ ...this.state, loading: true, error: null });
        this.loading = this.fetchAll().then(orders => this.publish({ orders, loading: false, error: null, loaded: true }))
            .catch(error => this.publish({ orders: [], loading: false, error: orderError(error), loaded: false }))
            .finally(() => { this.loading = null; });
        return this.loading;
    };
    private async fetchAll(): Promise<ApiOrder[]> {
        const orders: ApiOrder[] = [];
        let total: number | undefined;
        let page = 1;
        do {
            if (!this.enabled) throw new Error("Sessão de pedidos encerrada.");
            const response = await this.transport<OrderPage>(`/api/v1/supplier-orders?page=${page}&page_size=100`, { headers: this.headers() });
            if (response.page !== page || response.page_size !== 100 || !Number.isSafeInteger(response.total) || response.total < 0 || (total !== undefined && total !== response.total)) {
                throw new Error("A lista de pedidos mudou durante a paginação. Atualize para consultar novamente.");
            }
            total = response.total;
            orders.push(...response.items.map(order => this.check(order)));
            if (new Set(orders.map(order => order.id)).size !== orders.length || orders.length > total || (!response.items.length && orders.length < total)) {
                throw new Error("Paginação inconsistente. Atualize a lista de pedidos.");
            }
            page++;
        } while (orders.length < total);
        return orders;
    }
    detail(id: string): Promise<ApiOrder> {
        const pending = this.details.get(id);
        if (pending) return pending;
        const request = this.fetchDetail(id).finally(() => { this.details.delete(id); });
        this.details.set(id, request);
        return request;
    }
    private async fetchDetail(id: string): Promise<ApiOrder> {
        if (!this.enabled) throw new Error("Sessão de pedidos encerrada.");
        const order = this.check(await this.transport<ApiOrder>(`/api/v1/supplier-orders/${encodeURIComponent(id)}`, { headers: this.headers() }));
        if (order.id !== id) throw new Error("Pedido diferente do solicitado.");
        this.publish({ ...this.state, orders: this.state.orders.map(item => item.id === id ? order : item) });
        return order;
    }
    private async invalidate() {
        // Uma leitura iniciada antes da escrita não confirma o resultado da operação.
        await this.loading;
        await this.refresh();
    }
    private async post<T>(order: ApiOrder, path: string, body: unknown, idempotent = false): Promise<T> {
        if (!this.enabled) throw new Error("Sessão de pedidos encerrada.");
        this.check(order);
        if (this.pending.has(order.id)) throw new Error("Já existe uma operação em andamento neste pedido.");
        const serialized = JSON.stringify(body);
        const fingerprint = `${path}:${serialized}`;
        const headers: Record<string, string> = { ...this.headers(), "Content-Type": "application/json" };
        if (idempotent) {
            let key = this.attempts.get(fingerprint);
            if (!key) { key = crypto.randomUUID(); this.attempts.set(fingerprint, key); }
            headers["Idempotency-Key"] = key;
        }
        this.pending.add(order.id);
        try {
            return await this.transport<T>(path, { method: "POST", headers, body: serialized });
        } catch (error) {
            // Leitura apenas: não repete automaticamente operações sem idempotência.
            await this.invalidate();
            throw new Error(orderError(error));
        } finally { this.pending.delete(order.id); }
    }
    async accept(order: ApiOrder, quantities: number[]) {
        if (!acceptanceOpen(order)) throw new Error("Aceite indisponível ou prazo encerrado. Atualize o pedido.");
        if (quantities.length !== order.items.length || !quantities.length) throw new Error("Informe todas as linhas do pedido.");
        quantities.forEach((quantity, index) => assertQuantity(quantity, Math.min(order.items[index].requested_quantity, order.items[index].reserved_quantity)));
        if (!order.accepts_partial && !(quantities.every(value => value === 0) || quantities.every((value, index) => value === order.items[index].requested_quantity))) throw new Error("Este pedido não permite aceite parcial.");
        const body: Acceptance = { expected_version: order.version, lines: order.items.map((item, index) => ({ order_item_id: item.id, accepted_quantity: quantities[index] })) };
        await this.post<ApiOrder>(order, `/api/v1/supplier-orders/${order.id}/acceptance`, body, true);
        await this.invalidate();
    }
    async start(order: ApiOrder) {
        if (!order.allowed_actions.includes("start-separation") || !["ACCEPTED", "PARTIALLY_ACCEPTED"].includes(order.state)) throw new Error("Início de separação não permitido.");
        await this.post<ApiOrder>(order, `/api/v1/supplier-orders/${order.id}/start-separation`, { expected_version: order.version });
        await this.invalidate();
    }
    async allocate(order: ApiOrder, quantities: number[]) {
        if (order.state !== "SEPARATING" || !order.allowed_actions.includes("fulfillments")) throw new Error("Criação de lote não permitida.");
        if (quantities.length !== order.items.length) throw new Error("Revise as linhas do lote.");
        quantities.forEach((quantity, index) => assertQuantity(quantity, remainingAllocation(order, order.items[index].id)));
        const body: Allocation = { expected_version: order.version, lines: order.items.flatMap((item, index) => quantities[index] > 0 ? [{ order_item_id: item.id, allocated_quantity: quantities[index] }] : []) };
        if (!body.lines.length) throw new Error("Informe ao menos uma quantidade positiva para o lote.");
        await this.post<Fulfillment>(order, `/api/v1/supplier-orders/${order.id}/fulfillments`, body);
        await this.invalidate();
    }
    async separate(order: ApiOrder, fulfillment: Fulfillment, quantities: number[]) {
        this.checkFulfillment(order, fulfillment);
        if (quantities.length !== fulfillment.lines.length) throw new Error("Informe todas as linhas do lote.");
        quantities.forEach((quantity, index) => assertQuantity(quantity, fulfillment.lines[index].allocated_quantity));
        const body: Separation = { expected_version: fulfillment.version, lines: fulfillment.lines.map((line, index) => ({ fulfillment_line_id: line.id, separated_quantity: quantities[index] })) };
        await this.post<Fulfillment>(order, `/api/v1/fulfillments/${fulfillment.id}/separation-results`, body);
        await this.invalidate();
    }
    async ready(order: ApiOrder, fulfillment: Fulfillment) {
        this.checkFulfillment(order, fulfillment);
        if (!fulfillment.lines.length || fulfillment.lines.some(line => line.separated_quantity !== line.allocated_quantity)) throw new Error("Separe todas as quantidades antes de declarar o lote pronto.");
        await this.post<Fulfillment>(order, `/api/v1/fulfillments/${fulfillment.id}/mark-ready`, { expected_version: fulfillment.version });
        await this.invalidate();
    }
    private checkFulfillment(order: ApiOrder, fulfillment: Fulfillment) {
        if (order.state !== "SEPARATING" || !order.allowed_actions.includes("fulfillments") || fulfillment.state !== "SEPARATING" || fulfillment.supplier_order_id !== order.id || !order.fulfillments.some(item => item.id === fulfillment.id)) throw new Error("Operação indisponível para este lote.");
    }
}
export function remainingAllocation(order: ApiOrder, itemId: string) {
    const accepted = order.items.find(item => item.id === itemId)?.supplier_accepted_quantity ?? 0;
    const allocated = order.fulfillments.flatMap(item => item.lines).filter(line => line.order_item_id === itemId).reduce((sum, line) => sum + line.allocated_quantity, 0);
    return Math.max(0, accepted - allocated);
}
