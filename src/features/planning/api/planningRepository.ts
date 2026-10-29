import { authenticatedRequest } from "../../services/apiAuth.service";
import { ApiError } from "../../../shared/api/http";
import type { CanonicalRoute, CargoManifest, RouteFilters, RoutesPage } from "./planningTypes";

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
