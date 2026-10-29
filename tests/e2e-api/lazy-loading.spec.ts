import { expect, test } from "@playwright/test";

test("lazy login shows loading feedback and survives refresh without other portals", async ({ page }) => {
    const modules: string[] = [];
    page.on("request", request => modules.push(request.url()));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/src/app/pages/AuthPages.ts*", async route => { await gate; await route.continue(); });
    await page.route("http://localhost:8000/**", route => route.fulfill({ status: 401 }));
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status").filter({ hasText: "Carregando página" })).toBeVisible();
    release();
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    expect(modules.some(url => /AdminPages|PlanningDashboard|SupplierPortal|LegacyPages|exceljs/i.test(url))).toBe(false);
});

test("failed page module uses the existing safe error boundary", async ({ page }) => {
    await page.route("http://localhost:8000/**", route => route.fulfill({ status: 401 }));
    await page.route("**/src/app/pages/AuthPages.ts*", route => route.abort());
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Não foi possível carregar esta página" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

test("buyer direct URL and refresh do not download administrative or planning pages", async ({ page }) => {
    const modules: string[] = [];
    page.on("request", request => modules.push(request.url()));
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", route => {
        const path = new URL(route.request().url()).pathname;
        const user = { id: "buyer", name: "Comprador teste", email: "buyer@example.invalid", role: "BUYER_ADMIN", organization_id: "org", organizations: [{ id: "org", name: "Organização", role: "BUYER_ADMIN" }], capabilities: ["catalog:read", "purchase:read", "checkout:create"], demo_run_id: "demo", is_synthetic: true };
        if (path.endsWith("/auth/refresh")) return route.fulfill({ json: { access_token: "test", expires_in: 600, csrf_token: "csrf", user } });
        if (path.endsWith("/me")) return route.fulfill({ json: user });
        return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 25 } });
    });
    await page.goto("/comprador/compras");
    await expect(page.getByRole("heading", { name: "Minhas compras", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Minhas compras", exact: true })).toBeVisible();
    expect(modules.some(url => /AdminPages|PlanningDashboard|SupplierPortal|LegacyPages|exceljs/i.test(url))).toBe(false);
});
