import { expect, test, vi } from "vitest";
import { PlanningRepository, planningError } from "./planningRepository";
import { ApiError } from "../../../shared/api/http";
import type { RoutesPage } from "./planningTypes";

const page: RoutesPage = { items: [], total: 0, page: 1, page_size: 25, is_synthetic: true, label: "SIMULAÇÃO" };
test("requests only canonical GET routes with actual pagination, filters and organization", async () => {
    const transport = vi.fn().mockResolvedValue({ ...page, page: 2 });
    const repository = new PlanningRepository("org", transport);
    const controller = new AbortController();
    await repository.list(2, { state: "STARTED", active: "false" }, controller.signal);
    expect(transport).toHaveBeenCalledWith("/api/v1/routes?page=2&page_size=25&state=STARTED&active=false", {
        headers: { "X-Organization-Id": "org" }, signal: controller.signal,
    });
});
test("omits empty filters and refuses a missing organization", async () => {
    const transport = vi.fn().mockResolvedValue(page);
    await new PlanningRepository("org", transport).list(1, { state: "", active: "" });
    expect(transport.mock.calls[0][0]).toBe("/api/v1/routes?page=1&page_size=25");
    await expect(new PlanningRepository("", transport).list(1, { state: "", active: "" })).rejects.toThrow("Organização");
    expect(transport).toHaveBeenCalledTimes(1);
});
test.each([{ total: -1 }, { total: 1.5 }, { page: 2 }, { page_size: 100 }, { items: null }])("rejects invalid pagination %j", async invalid => {
    const transport = vi.fn().mockResolvedValue({ ...page, ...invalid });
    await expect(new PlanningRepository("org", transport).list(1, { state: "", active: "" })).rejects.toThrow("paginação inválida");
});
test("preserves API failures and presents session, authorization and network diagnostics", async () => {
    const failure = new ApiError(403);
    const transport = vi.fn().mockRejectedValue(failure);
    await expect(new PlanningRepository("org", transport).list(1, { state: "", active: "" })).rejects.toBe(failure);
    expect(planningError(failure)).toContain("Sem autorização");
    expect(planningError(new ApiError(401))).toContain("Sessão expirada");
    expect(planningError(new ApiError(500))).toContain("Tente novamente");
    expect(planningError(new Error("Falha de rede"))).toBe("Falha de rede");
});
