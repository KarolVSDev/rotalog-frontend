import { authenticatedRequest } from "../../services/apiAuth.service";
import { ApiError } from "../../../shared/api/http";
import type { CanonicalRoute, CargoManifest, RouteFilters, RoutesPage, RouteTracking, TrackingHistory } from "./planningTypes";
import type { Driver, Vehicle, ManualPlan, RoutePlan } from "./planTypes";

type Transport = typeof authenticatedRequest;
export class PlanningRepository {
    private organizationId: string;
    private transport: Transport;
    constructor(organizationId: string, transport: Transport = authenticatedRequest) {
        this.organizationId = organizationId;
        this.transport = transport;
    }
    private options(signal?: AbortSignal): RequestInit {
        if (!this.organizationId) throw new Error("Organização não disponível. Entre novamente.");
        return { headers: { "X-Organization-Id": this.organizationId }, signal };
    }
    drivers(signal?: AbortSignal): Promise<Driver[]> {
        return this.transport<Driver[]>("/api/v1/drivers", this.options(signal));
    }
    vehicles(signal?: AbortSignal): Promise<Vehicle[]> {
        return this.transport<Vehicle[]>("/api/v1/vehicles", this.options(signal));
    }
    async plan(id: string, signal?: AbortSignal): Promise<RoutePlan> {
        const result = await this.transport<RoutePlan>(`/api/v1/route-plan-versions/${encodeURIComponent(id)}`, this.options(signal));
        if (result.id !== id || !Number.isInteger(result.version) || result.version < 1 || !result.snapshot) throw new Error("Resposta inválida de proposta.");
        return result;
    }
    private postPlan<T>(path: string, body: unknown, key: string): Promise<T> {
        const options = this.options();
        return this.transport<T>(path, { ...options, method: "POST", headers: { ...options.headers, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) }, false);
    }
    createPlan(body: ManualPlan, key: string): Promise<RoutePlan> {
        return this.postPlan("/api/v1/route-plan-versions", body, key);
    }
    approvePlan(id: string, version: number, key: string): Promise<RoutePlan> {
        return this.postPlan(`/api/v1/route-plan-versions/${encodeURIComponent(id)}/approve`, { expected_version: version }, key);
    }
    publishPlan(id: string, version: number, key: string): Promise<CanonicalRoute> {
        return this.postPlan(`/api/v1/route-plan-versions/${encodeURIComponent(id)}/publish`, { expected_version: version }, key);
    }
    async trackingCurrent(id: string, signal?: AbortSignal): Promise<RouteTracking> {
        const result = await this.transport<RouteTracking>(`/api/v1/routes/${encodeURIComponent(id)}/tracking/current`, this.options(signal));
        if (result.route_id !== id || !(result.position === null || typeof result.position === "object")) throw new Error("Resposta inválida de rastreamento.");
        return result;
    }
    async trackingHistory(id: string, cursor: string | null = null, signal?: AbortSignal): Promise<TrackingHistory> {
        const query = new URLSearchParams({ page_size: "50" });
        if (cursor !== null) query.set("cursor", cursor);
        const result = await this.transport<TrackingHistory>(`/api/v1/routes/${encodeURIComponent(id)}/tracking/history?${query}`, this.options(signal));
        if (result.route_id !== id || !Array.isArray(result.items) || !(result.next_cursor === null || typeof result.next_cursor === "string")) throw new Error("Resposta inválida do histórico de posições.");
        return result;
    }
    async detail(id: string, signal?: AbortSignal): Promise<CanonicalRoute> {
        const result = await this.transport<CanonicalRoute>(`/api/v1/routes/${encodeURIComponent(id)}`, this.options(signal));
        if (result.id !== id || !Array.isArray(result.stops)) throw new Error("Resposta inválida para a rota solicitada.");
        return result;
    }
    async manifest(id: string, signal?: AbortSignal): Promise<CargoManifest> {
        const result = await this.transport<CargoManifest>(`/api/v1/routes/${encodeURIComponent(id)}/manifest`, this.options(signal));
        if (result.route_id !== id || !Array.isArray(result.lines) || !Array.isArray(result.issues)) throw new Error("Resposta inválida para o manifesto solicitado.");
        return result;
    }
    async list(page: number, filters: RouteFilters, signal?: AbortSignal): Promise<RoutesPage> {
        if (!this.organizationId) throw new Error("Organização não disponível. Entre novamente.");
        const query = new URLSearchParams({ page: String(page), page_size: "25" });
        if (filters.state) query.set("state", filters.state);
        if (filters.active) query.set("active", filters.active);
        const result = await this.transport<RoutesPage>(`/api/v1/routes?${query}`, {
            headers: { "X-Organization-Id": this.organizationId }, signal,
        });
        if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0 ||
            result.page !== page || result.page_size !== 25 || result.items.length > 25) {
            throw new Error("A API retornou uma paginação inválida. Atualize a consulta.");
        }
        return result;
    }
}
export function planError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 409) return error.code === "IDEMPOTENCY_KEY_REUSED" ? "Chave de operação já utilizada com outro conteúdo. Consulte a proposta antes de continuar." : "Conflito de versão ou regra operacional. Consulte novamente a proposta e revise os dados.";
        if (error.status === 422) return "Dados inválidos. Revise os campos, quantidades e janelas.";
        if (error.status === 403) return "Sem autorização para esta operação de planejamento.";
        if (error.status === 404) return "Proposta não encontrada ou indisponível para esta sessão.";
        if (error.status === 401) return "Sessão expirada. Entre novamente.";
    }
    return "Não foi possível confirmar o resultado. Não inicie outra operação: consulte a proposta ou repita a mesma tentativa com os mesmos dados.";
}
export function trackingError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return "Sessão expirada. Entre novamente.";
        if (error.status === 403) return "Sem autorização para consultar o rastreamento.";
        if (error.status === 404) return "Rastreamento não encontrado ou indisponível para esta sessão.";
        if (error.status === 422) return "Consulta de histórico inválida. Atualize o rastreamento para reiniciar a consulta.";
        if (error.status === 429) return "Muitas consultas. Aguarde antes de atualizar o rastreamento.";
        return "Não foi possível consultar o rastreamento. Tente novamente.";
    }
    return error instanceof Error ? error.message : "Não foi possível consultar o rastreamento.";
}
export function routeDetailError(error: unknown, manifest = false): string {
    const resource = manifest ? "Manifesto" : "Rota";
    if (error instanceof ApiError) {
        if (error.status === 404) return `${resource} não ${manifest ? "encontrado" : "encontrada"} ou indisponível para esta sessão.`;
        if (error.status === 403) return `Sem autorização para consultar ${manifest ? "o manifesto" : "esta rota"}.`;
        if (error.status === 401) return "Sessão expirada. Entre novamente.";
    }
    return manifest ? `Manifesto indisponível. ${planningError(error)}` : planningError(error);
}
export function planningError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return "Sessão expirada. Entre novamente.";
        if (error.status === 403) return "Sem autorização para consultar as rotas.";
        if (error.status === 422) return "Filtros inválidos. Revise a consulta.";
        if (error.status === 429) return "Muitas consultas. Aguarde e tente novamente.";
        return "Não foi possível consultar as rotas. Tente novamente.";
    }
    return error instanceof Error ? error.message : "Não foi possível consultar as rotas.";
}
