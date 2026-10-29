import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, restore = true, role = "ROUTE_PLANNER") {
    const state = {
        role, organization_id: "active-org", capability: true, membership: true, meStatus: 200,
        requests: [] as string[],
    };
    if (restore) await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "synthetic-csrf"));
    await page.route("http://localhost:8000/**", async route => {
        const path = new URL(route.request().url()).pathname;
        state.requests.push(path);
        const supplier = state.role === "SUPPLIER_OPERATOR";
        const user = { id: "operator", name: "Operador", email: "operator@example.invalid", role: state.role,
            organization_id: state.organization_id,
            organizations: [{ id: state.membership ? state.organization_id : "other", name: "Organização", role: state.role }],
            capabilities: state.capability ? supplier ? ["supplier_order:manage", "offer:write", "inventory:write"] : ["route:plan", "route:publish", "fleet:manage"] : [],
            demo_run_id: "demo", is_synthetic: true };
        if (path === "/api/v1/me") return route.fulfill({ status: state.meStatus, json: user });
        if (/\/auth\/(login|refresh)$/.test(path)) return route.fulfill({ json: { access_token: "synthetic", token_type: "bearer", expires_in: 600, csrf_token: "synthetic-csrf", user } });
        if (path === "/api/v1/auth/logout") return route.fulfill({ status: 204 });
        if (!supplier && path === "/api/v1/routes") return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 25, is_synthetic: true } });
        if (supplier && path === "/api/v1/supplier-orders") return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 100 } });
        return route.fulfill({ status: 403, json: { error: { code: "CAPABILITY_REQUIRED" } } });
    });
    return state;
}
test("planner logs in, restores, uses shared navigation and logs out", async ({ page }) => {
    const state = await setup(page, false);
    await page.goto("/fornecedor/planejamento");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("E-mail", { exact: true }).fill("operator@example.invalid");
    await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Planejamento", exact: true })).toBeVisible();
    await expect(page.locator(".supplier-sidebar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedidos", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Minha conta", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Planejamento", exact: true })).toBeVisible();
    expect(state.requests.every(path => /\/auth\/|\/me$|^\/api\/v1\/routes$/.test(path))).toBe(true);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Planejamento", exact: true })).toHaveCount(0);
});
test("planner cannot mount commercial pages or administrative pages", async ({ page }) => {
    const state = await setup(page);
    for (const path of ["/fornecedor/pedidos", "/fornecedor/produtos", "/fornecedor/estoque", "/fornecedor/rotas", "/fornecedor/conta"]) {
        await page.goto(path);
        await expect(page.getByRole("alert")).toContainText("Acesso não autorizado");
    }
    await page.goto("/admin/products/new");
    await expect(page).toHaveURL(/\/fornecedor\/planejamento$/);
    expect(state.requests.every(path => /\/auth\/|\/me$|^\/api\/v1\/routes$/.test(path))).toBe(true);
});
test("supplier cannot mount planning and retains supplier navigation", async ({ page }) => {
    await setup(page, true, "SUPPLIER_OPERATOR");
    await page.goto("/fornecedor/planejamento");
    await expect(page.getByRole("alert")).toContainText("Acesso não autorizado");
    await page.goto("/fornecedor");
    await expect(page.getByRole("link", { name: "Pedidos", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Planejamento", exact: true })).toHaveCount(0);
});
for (const missing of ["capability", "membership"] as const) test(`restoration rejects missing ${missing}`, async ({ page }) => {
    const state = await setup(page);
    state[missing] = false;
    await page.goto("/fornecedor/planejamento");
    await expect(page).toHaveURL(/\/login$/);
});
test("revalidation distinguishes network failure from revoked capability", async ({ page }) => {
    const state = await setup(page);
    await page.goto("/fornecedor/planejamento");
    await expect(page.getByRole("heading", { name: "Planejamento", exact: true })).toBeVisible();
    state.meStatus = 503;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => state.requests.filter(path => path === "/api/v1/me").length).toBeGreaterThan(1);
    await expect(page.getByRole("heading", { name: "Planejamento", exact: true })).toBeVisible();
    state.meStatus = 200; state.capability = false;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page).toHaveURL(/\/login$/);
});
test("mobile navigation uses the shared sidebar without commercial links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto("/fornecedor/planejamento");
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Menu operacional" });
    await expect(menu.getByRole("link", { name: "Planejamento", exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Produtos", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
});
