import { expect, test, vi } from "vitest";
import { PlanningRepository, planningError, routeDetailError, trackingError } from "./planningRepository";
import { ApiError } from "../../../shared/api/http";
import type { RoutesPage } from "./planningTypes";
import { routeFixture, manifestFixture, trackingFixture } from "../../../../tests/fixtures/planning";
import { manualPlanFixture, planFixture, planId } from "../../../../tests/fixtures/route-plan";

test("planning writes preserve exact versions, idempotency keys and disable automatic auth replay", async () => {
    const transport = vi.fn().mockResolvedValue(planFixture);
    const repository = new PlanningRepository("org", transport);
    await repository.createPlan(manualPlanFixture, "create-key");
    await repository.approvePlan(planId, 1, "approve-key");
    await repository.publishPlan(planId, 2, "publish-key");
    expect(transport.mock.calls.map(call => call[2])).toEqual([false, false, false]);
    expect(transport.mock.calls.map(call => JSON.parse(call[1].body))).toEqual([manualPlanFixture, { expected_version: 1 }, { expected_version: 2 }]);
    expect(transport.mock.calls.map(call => call[1].headers["Idempotency-Key"])).toEqual(["create-key", "approve-key", "publish-key"]);
});

test("tracking GET contracts preserve nullable position, opaque cursor, organization and abort signal", async () => {
    const history = { route_id: "test-route", items: [], next_cursor: null, is_synthetic: true };
    const transport = vi.fn().mockResolvedValueOnce(trackingFixture).mockResolvedValueOnce(history);
    const repository = new PlanningRepository("org", transport);
    const signal = new AbortController().signal;
    expect(await repository.trackingCurrent("test-route", signal)).toBe(trackingFixture);
    expect(await repository.trackingHistory("test-route", "a+/=", signal)).toBe(history);
    expect(transport.mock.calls.map(call => call[0])).toEqual(["/api/v1/routes/test-route/tracking/current", "/api/v1/routes/test-route/tracking/history?page_size=50&cursor=a%2B%2F%3D"]);
    for (const call of transport.mock.calls) expect(call[1]).toEqual({ headers: { "X-Organization-Id": "org" }, signal });
});
test.each([401, 403, 404, 422, 429, 500])("tracking maps HTTP %i to a diagnostic", status => {
    expect(trackingError(new ApiError(status))).toMatch(/Sessão expirada|Sem autorização|não encontrado|inválida|Muitas consultas|Não foi possível/);
});

test("detail and manifest use canonical GET endpoints and preserve organization and cancellation", async () => {
    const transport = vi.fn().mockResolvedValueOnce(routeFixture).mockResolvedValueOnce(manifestFixture);
    const repository = new PlanningRepository("org", transport);
    const signal = new AbortController().signal;
    expect(await repository.detail("test-route", signal)).toBe(routeFixture);
    expect(await repository.manifest("test-route", signal)).toBe(manifestFixture);
    expect(transport.mock.calls.map(call => call[0])).toEqual(["/api/v1/routes/test-route", "/api/v1/routes/test-route/manifest"]);
    for (const call of transport.mock.calls) expect(call[1]).toEqual({ headers: { "X-Organization-Id": "org" }, signal });
});
test("refuses mismatched resources and missing context", async () => {
    const transport = vi.fn().mockResolvedValueOnce({ ...routeFixture, id: "other" }).mockResolvedValueOnce({ ...manifestFixture, route_id: "other" });
    const repository = new PlanningRepository("org", transport);
    await expect(repository.detail("test-route")).rejects.toThrow("Resposta inválida");
    await expect(repository.manifest("test-route")).rejects.toThrow("Resposta inválida");
    await expect(new PlanningRepository("", transport).detail("test-route")).rejects.toThrow("Organização");
    expect(routeDetailError(new ApiError(404))).toContain("Rota não encontrada");
    expect(routeDetailError(new ApiError(404), true)).toContain("Manifesto não encontrado");
    expect(routeDetailError(new ApiError(403), true)).toContain("Sem autorização");
    expect(routeDetailError(new ApiError(401))).toContain("Sessão expirada");
});

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
