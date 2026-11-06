import { planStockReservation } from "../../inventory/services/stockReservation";
import { withOrderWriteLock } from "./orderWriteLock";
import { createReservationMovements } from "../../inventory/services/stockMovements";
import { getSupplierProducts } from "../../products/services/supplierProducts.service";
import type { SupplierProduct } from "../../products/mocks/products.mock";
import {
    ordersMock,
    rejectionReasons,
    type OrderRejectionReason,
    type CommercialStatus,
    type SupplierOrder,
} from "../mocks/orders.mock";

export type SupplierOrderAction = "accept" | "reject";

const STORAGE_KEY = "rotalog:supplier-orders:v1";
const ORDERS_CHANGED_EVENT = "rotalog:supplier-orders-changed";

function isSupplierOrder(value: unknown): value is SupplierOrder {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const order = value as Partial<SupplierOrder>;

    return (
        typeof order.id === "string" &&
        typeof order.organizationId === "string" &&
        typeof order.customer === "string" &&
        typeof order.total === "number" &&
        typeof order.status === "string"
    );
}

export function readSupplierOrders(): SupplierOrder[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return ordersMock.map((order) => ({ ...order }));
    let parsed: unknown;
    try { parsed = JSON.parse(stored); }
    catch { throw new Error("Pedidos salvos inválidos. Nenhum dado foi sobrescrito."); }
    if (!Array.isArray(parsed) || !parsed.every(isSupplierOrder)) {
        throw new Error("Pedidos salvos inválidos. Nenhum dado foi sobrescrito.");
    }
    return parsed;
}

export function getSupplierOrders(): SupplierOrder[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            const parsed: unknown = JSON.parse(stored);

            if (
                Array.isArray(parsed) &&
                parsed.every(isSupplierOrder)
            ) {
                return parsed;
            }
        }
    } catch {
        // Em caso de dados inválidos ou armazenamento indisponível,
        // utiliza os pedidos demonstrativos.
    }

    return ordersMock.map((order) => ({ ...order }));
}

export function saveSupplierOrders(
    orders: SupplierOrder[]
): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        let current: unknown;
        try { current = JSON.parse(stored); } catch { throw new Error("Pedidos salvos inválidos. Atualize a página antes de continuar."); }
        if (!Array.isArray(current) || !current.every(isSupplierOrder)) throw new Error("Pedidos salvos inválidos.");
        for (const order of current as SupplierOrder[]) {
            if (!order.stockReservation) continue;
            const next = orders.find((item) => item.id === order.id && item.organizationId === order.organizationId);
            if (!next || JSON.stringify(next.stockReservation) !== JSON.stringify(order.stockReservation) || next.commercialStatus !== "Aceito") {
                throw new Error("Os pedidos foram atualizados em outra operação. Recarregue a página para preservar as reservas.");
            }
        }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
}

export function subscribeSupplierOrders(onChange: () => void): () => void {
    function handleStorage(event: StorageEvent) {
        if (event.storageArea === localStorage &&
            (event.key === STORAGE_KEY || event.key === null)) {
            onChange();
        }
    }

    window.addEventListener(ORDERS_CHANGED_EVENT, onChange);
    window.addEventListener("storage", handleStorage);
    return () => {
        window.removeEventListener(ORDERS_CHANGED_EVENT, onChange);
        window.removeEventListener("storage", handleStorage);
    };
}

export function changeSupplierOrderStatus(
    orders: SupplierOrder[],
    organizationId: string,
    orderId: string,
    action: SupplierOrderAction,
    rejection?: { reason: OrderRejectionReason; justification: string },
    products?: SupplierProduct[]
): SupplierOrder[] {
    const order = orders.find(
        (item) =>
            item.id === orderId &&
            item.organizationId === organizationId
    );

    if (!order) {
        throw new Error(
            "Pedido não encontrado para esta organização."
        );
    }

    if (order.commercialStatus !== "Aguardando aceite") {
        throw new Error(
            "Este pedido não está aguardando aceite."
        );
    }

    if (action === "reject") {
        if (order.status !== "Pendente" ||
            (order.custodyStatus !== undefined && order.custodyStatus !== "Aguardando separação")) {
            throw new Error("Pedidos em preparação não podem ser recusados.");
        }
        if (!rejection || !rejectionReasons.includes(rejection.reason) ||
            typeof rejection.justification !== "string" || !rejection.justification.trim()) {
            throw new Error("Selecione um motivo e informe a justificativa da recusa.");
        }
    }
    let stockReservation: SupplierOrder["stockReservation"];
    if (action === "accept") {
        if (order.status !== "Pendente" || (order.custodyStatus !== undefined && order.custodyStatus !== "Aguardando separação")) {
            throw new Error("Somente pedidos novos podem ser aceitos.");
        }
        if (!products) throw new Error("O aceite deve ser realizado pelo serviço de reserva de estoque.");
        stockReservation = planStockReservation(order, products, orders);
    }
    const rejectionRecord = action === "reject" && rejection ? {
        reason: rejection.reason,
        justification: rejection.justification.trim(),
        rejectedAt: new Date().toISOString(),
    } : undefined;

    const nextCommercialStatus: CommercialStatus =
        action === "accept" ? "Aceito" : "Recusado";

    return orders.map((item) =>
        item.id === orderId &&
        item.organizationId === organizationId
            ? {
                  ...item,
                  commercialStatus: nextCommercialStatus,
                  ...(stockReservation ? { stockReservation } : {}),
                  ...(rejectionRecord ? { rejection: rejectionRecord } : {}),
              }
            : item
    );
}

export type SupplierOperationalAction =
    | "start-separation"
    | "mark-ready";

export function changeSupplierOrderOperationalStatus(
    orders: SupplierOrder[],
    organizationId: string,
    orderId: string,
    action: SupplierOperationalAction
): SupplierOrder[] {
    const order = orders.find(
        (item) =>
            item.id === orderId &&
            item.organizationId === organizationId
    );

    if (!order) {
        throw new Error(
            "Pedido não encontrado para esta organização."
        );
    }

    if (order.commercialStatus !== "Aceito") {
        throw new Error(
            "Somente pedidos aceitos podem avançar na preparação."
        );
    }

    if (
        action === "start-separation" &&
        order.custodyStatus !== "Aguardando separação"
    ) {
        throw new Error(
            "Este pedido não está aguardando separação."
        );
    }

    if (
        action === "mark-ready" &&
        order.custodyStatus !== "Em separação"
    ) {
        throw new Error(
            "Este pedido não está em separação."
        );
    }

    return orders.map((item) => {
        if (
            item.id !== orderId ||
            item.organizationId !== organizationId
        ) {
            return item;
        }

        return {
            ...item,
            custodyStatus:
                action === "start-separation"
                    ? "Em separação" as const
                    : "Pronto para coleta" as const,
            status:
                action === "start-separation"
                    ? "Em separação" as const
                    : item.status,
        };
    });
}

export interface SupplierOrderAcceptanceService {
    accept(organizationId: string, orderId: string): Promise<SupplierOrder[]>;
}

// Uma única gravação contém pedido e reserva. O lock serializa o aceite
// entre abas da mesma origem; nenhuma quantidade física é alterada.
export const localSupplierOrderAcceptanceService: SupplierOrderAcceptanceService = {
    async accept(organizationId, orderId) {
        if (!organizationId) throw new Error("Organização ativa inválida.");
        return withOrderWriteLock(() => {
            // Diferentemente da leitura de apresentação, uma gravação nunca
            // substitui dados inválidos silenciosamente pelos mocks.
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                let parsed: unknown;
                try { parsed = JSON.parse(stored); } catch { throw new Error("Pedidos salvos inválidos. Nenhuma reserva foi criada."); }
                if (!Array.isArray(parsed) || !parsed.every(isSupplierOrder)) throw new Error("Pedidos salvos inválidos. Nenhuma reserva foi criada.");
            }
            const orders = readSupplierOrders();
            const products = getSupplierProducts(organizationId);
            const updated = changeSupplierOrderStatus(orders, organizationId, orderId, "accept", undefined, products);
            const accepted = updated.find(order => order.id === orderId && order.organizationId === organizationId)!;
            accepted.stockReservation!.movements = createReservationMovements(accepted, products);
            saveSupplierOrders(updated);
            return updated;
        });
    },
};
