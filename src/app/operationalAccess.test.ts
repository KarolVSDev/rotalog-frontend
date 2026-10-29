import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiAuthService, authorize, plannerAuthorized, type ApiUser } from "../features/services/apiAuth.service";
import { request } from "../shared/api/http";
import { adminRoutes, canAccessAdminRoute, canAccessOperationalRoute, defaultUserPath, loginDestination, operationalRoutes } from "./routePermissions";

vi.mock("../shared/api/config", () => ({ authMode: "api", apiUrl: "http://localhost:8000" }));
vi.mock("../shared/api/http", async importOriginal => ({ ...await importOriginal<typeof import("../shared/api/http")>(), request: vi.fn() }));
const planner: ApiUser = {
    id: "planner", name: "Planejador", email: "planner@example.invalid", role: "ROUTE_PLANNER",
    organization_id: "org", organizations: [{ id: "org", name: "Operação", role: "ROUTE_PLANNER" }],
    capabilities: ["route:plan", "route:publish", "fleet:manage"], demo_run_id: "demo", is_synthetic: true,
};
const token = { access_token: "synthetic", expires_in: 600, csrf_token: "synthetic-csrf", user: planner };
beforeEach(() => {
    apiAuthService.endLocalSession();
    vi.mocked(request).mockReset();
    vi.mocked(request).mockImplementation(async path => path === "/api/v1/me" ? planner : token);
});
afterEach(() => { apiAuthService.endLocalSession(); });

test("planner requires the active membership and actual route:plan capability", () => {
    expect(plannerAuthorized(planner)).toBe(true);
    for (const user of [
        { ...planner, organization_id: "other" },
        { ...planner, organizations: [] },
        { ...planner, capabilities: ["route:publish"] },
        { ...planner, organizations: [{ id: "org", name: "Org", role: "SUPPLIER_OPERATOR" as const }] },
    ]) {
        expect(plannerAuthorized(user)).toBe(false);
        expect(() => authorize(user)).toThrow();
        expect(operationalRoutes(user)).toEqual([]);
    }
});
test("membership roles and capabilities are never combined across organizations", () => {
    const user = { ...planner, organization_id: "supplier", organizations: [...planner.organizations, { id: "supplier", name: "Fornecedor", role: "SUPPLIER_OPERATOR" as const }] };
    expect(plannerAuthorized(user)).toBe(false);
    expect(canAccessOperationalRoute(user, "/fornecedor/planejamento")).toBe(false);
});
test("planner only receives planning navigation and cannot access commerce or account", () => {
    expect(operationalRoutes(planner)).toEqual([{ path: "/fornecedor/planejamento", label: "Planejamento" }]);
    for (const path of ["/fornecedor", "/fornecedor/pedidos", "/fornecedor/produtos", "/fornecedor/estoque", "/fornecedor/rotas", "/fornecedor/conta", "/admin"]) {
        expect(canAccessOperationalRoute(planner, path)).toBe(false);
    }
});
test("supplier retains commerce while admin and driver never inherit planning", () => {
    const supplier: ApiUser = { ...planner, role: "SUPPLIER_OPERATOR", organizations: [{ id: "org", name: "Org", role: "SUPPLIER_OPERATOR" }], capabilities: ["supplier_order:manage", "offer:write", "inventory:write", "route:plan"] };
    expect(operationalRoutes(supplier)).toHaveLength(5);
    expect(canAccessOperationalRoute(supplier, "/fornecedor/planejamento")).toBe(false);
    for (const role of ["ROTALOG_ADMIN", "DRIVER"] as const) {
        const user = { ...planner, role, organizations: [{ id: "org", name: "Org", role }] };
        expect(operationalRoutes(user)).toEqual([]);
    }
});
test("post-login destinations reject foreign, malformed and unavailable paths", () => {
    expect(defaultUserPath(planner)).toBe("/fornecedor/planejamento");
    expect(loginDestination(planner, "/fornecedor/planejamento", true)).toBe("/fornecedor/planejamento");
    for (const path of ["/fornecedor/pedidos", "/admin", "//evil.invalid", "/fornecedor/planejamento-extra", "/fornecedor/planejamento/../pedidos", "/fornecedor/%70edidos", "/login", undefined]) {
        expect(loginDestination(planner, path, true)).toBe("/fornecedor/planejamento");
    }
});
test("buyer, administrator and mock supplier retain their destinations", () => {
    const buyer: ApiUser = { ...planner, role: "BUYER_ADMIN", organizations: [{ id: "org", name: "Org", role: "BUYER_ADMIN" }], capabilities: ["purchase:read"] };
    expect(defaultUserPath(buyer)).toBe("/comprador/compras");
    expect(loginDestination(buyer, "/comprador/compras/purchase", true)).toBe("/comprador/compras/purchase");
    expect(loginDestination(buyer, "/comprador/carrinho", true)).toBe("/comprador/compras");
    const admin: ApiUser = { ...planner, role: "ROTALOG_ADMIN", organizations: [{ id: "org", name: "Org", role: "ROTALOG_ADMIN" }], capabilities: ["catalog:read", "product:write"] };
    expect(loginDestination(admin, "/admin/products/new", true)).toBe("/admin/products/new");
    expect(loginDestination(admin, "/fornecedor/planejamento", true)).toBe("/admin");
    expect(loginDestination({ ...admin, capabilities: ["catalog:read"] }, "/admin/products/new", true)).toBe("/admin");
    expect(defaultUserPath({ ...planner, role: "SUPPLIER_OPERATOR" }, false)).toBe("/fornecedor");
});
test("admin navigation exposes catalog and account routes by capability", () => {
    const admin: ApiUser = { ...planner, role: "ROTALOG_ADMIN", organizations: [{ id: "org", name: "Org", role: "ROTALOG_ADMIN" }], capabilities: ["catalog:read", "product:write", "warehouse:review"] };
    expect(adminRoutes(admin)).toEqual([
        { path: "/admin", label: "Visão geral" },
        { path: "/admin/products", label: "Produtos publicados" },
        { path: "/admin/products/new", label: "Cadastrar produto" },
    ]);
    expect(canAccessAdminRoute(admin, "/admin/account")).toBe(true);

    const catalogOnly = { ...admin, capabilities: ["catalog:read"] };
    expect(adminRoutes(catalogOnly)).toEqual([
        { path: "/admin", label: "Visão geral" },
        { path: "/admin/products", label: "Produtos publicados" },
    ]);
    expect(canAccessAdminRoute(catalogOnly, "/admin/products/new")).toBe(false);
    expect(canAccessAdminRoute({ ...admin, capabilities: ["product:write"] }, "/admin")).toBe(false);
    expect(canAccessAdminRoute({ ...admin, role: "SUPPLIER_OPERATOR", organizations: [{ id: "org", name: "Org", role: "SUPPLIER_OPERATOR" }], capabilities: ["catalog:read", "product:write"] }, "/admin")).toBe(false);
    expect(canAccessAdminRoute(planner, "/admin")).toBe(false);
});
test("mock buyer login without a requested destination preserves purchases", () => {
    const buyer = { id: "mock-buyer", name: "Comprador", email: "buyer@example.invalid", role: "BUYER_ADMIN" as const };
    expect(defaultUserPath(buyer, false)).toBe("/comprador/compras");
    expect(loginDestination(buyer, undefined, false)).toBe("/comprador/compras");
    expect(loginDestination(buyer, "/comprador/carrinho", false)).toBe("/comprador/carrinho");
    expect(loginDestination(buyer, "/", false)).toBe("/");
});
test("login uses browser credentials and validates /me rather than token profile", async () => {
    expect(await apiAuthService.login({ email: planner.email, password: "synthetic-password" })).toEqual(planner);
    expect(request).toHaveBeenCalledWith("/api/v1/auth/login?client_type=browser", expect.objectContaining({ method: "POST", body: expect.any(URLSearchParams) }));
    expect(request).toHaveBeenCalledWith("/api/v1/me", expect.objectContaining({ headers: expect.any(Headers) }));
});
test("restores a planner through refresh and /me and logout prevents restoration", async () => {
    sessionStorage.setItem("rotalog:api-csrf", "synthetic-csrf");
    expect(await apiAuthService.restore()).toEqual(planner);
    expect(request).toHaveBeenCalledWith("/api/v1/auth/refresh", expect.objectContaining({ headers: { "X-CSRF-Token": "synthetic-csrf" } }));
    await apiAuthService.logout();
    expect(await apiAuthService.restore()).toBeNull();
});
test("invalid /me is rejected after login and restoration", async () => {
    vi.mocked(request).mockImplementation(async path => path === "/api/v1/me" ? { ...planner, capabilities: [] } : token);
    await expect(apiAuthService.login({ email: planner.email, password: "synthetic-password" })).rejects.toThrow();
    sessionStorage.setItem("rotalog:api-csrf", "synthetic-csrf");
    expect(await apiAuthService.restore()).toBeNull();
    expect(sessionStorage.getItem("rotalog:api-csrf")).toBeNull();
});
