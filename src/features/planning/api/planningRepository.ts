import { authenticatedRequest } from "../../services/apiAuth.service";
import { ApiError } from "../../../shared/api/http";
import type { RouteFilters, RoutesPage } from "./planningTypes";

type Transport = typeof authenticatedRequest;
export class PlanningRepository {
    private organizationId: string;
    private transport: Transport;
    constructor(organizationId: string, transport: Transport = authenticatedRequest) {
        this.organizationId = organizationId;
        this.transport = transport;
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
