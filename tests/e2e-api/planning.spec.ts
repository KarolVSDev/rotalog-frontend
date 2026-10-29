import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function setup(page: Page) {
    const state = { status: 200, network: false, empty: false, expire: false, delay: 0, calls: [] as URL[], writes: [] as string[] };
    const user = { id: "planner", name: "Planejador de teste", email: "planner@example.invalid", role: "ROUTE_PLANNER",
        organization_id: "org", organizations: [{ id: "org", name: "Organização de teste", role: "ROUTE_PLANNER" }],
        capabilities: ["route:plan", "route:publish", "fleet:manage"], demo_run_id: "demo", is_synthetic: true };
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === "/api/v1/auth/refresh") return state.expire ? route.fulfill({ status: 401 }) : route.fulfill({ json: { access_token: "access", expires_in: 600, csrf_token: "csrf", user } });
        if (url.pathname === "/api/v1/me") return route.fulfill({ json: user });
        if (request.method() !== "GET") state.writes.push(url.pathname);
        if (url.pathname === "/api/v1/routes") {
            expect(request.method()).toBe("GET");
            expect(request.headers()["authorization"]).toBe("Bearer access");
            expect(request.headers()["x-organization-id"]).toBe("org");
            state.calls.push(url);
            if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
            if (state.network) return route.abort();
            if (state.status !== 200) return route.fulfill({ status: state.status });
            const pageNumber = Number(url.searchParams.get("page"));
            const filtered = url.searchParams.has("state") || url.searchParams.has("active");
            const total = state.empty ? 0 : filtered ? 1 : 26;
            const count = total === 0 ? 0 : filtered || pageNumber === 2 ? 1 : 25;
            return route.fulfill({ json: { items: Array.from({ length: count }, (_, index) => ({
                id: `route-${pageNumber}-${index}`, code: `R-${pageNumber}-${index}`, state: url.searchParams.get("state") || "PUBLISHED",
                version: 1, driver_id: "driver", vehicle_id: "vehicle", warehouse_id: "warehouse", plan_version_id: "plan",
                updated_at: "2026-10-29T12:00:00Z", scheduled_date: index === 0 ? "2026-11-03" : null,
                vehicle: index === 0 ? { id: "vehicle", registration: "TEST-123", package_units: 100, weight_grams: 10000, volume_cm3: 10000 } : null,
                cargo: index === 0 ? { total_sellable_packages: 12 } : null,
                stops: [{ id: "pickup", sequence: 0, kind: "PICKUP" }, { id: "delivery", sequence: 1, kind: "DELIVERY" }],
                allowed_actions: [], is_synthetic: true,
            })), total, page: pageNumber, page_size: 25, is_synthetic: true, label: "SIMULAÇÃO" } });
        }
        throw new Error(`Unexpected endpoint: ${url.pathname}`);
    });
    return state;
}
const path = "/fornecedor/planejamento";
test("lists canonical routes with correct totals, optional fields and real pagination", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await expect(page.getByText("26", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Rotas encontradas" }).getByRole("listitem")).toHaveCount(25);
    await expect(page.getByText("03/11/2026", { exact: true })).toBeVisible();
    await expect(page.getByText("TEST-123", { exact: true })).toBeVisible();
    await expect(page.getByText("12 volumes vendáveis", { exact: true })).toBeVisible();
    await expect(page.getByText("Não informada", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Anterior", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByRole("heading", { name: "R-2-0", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próxima", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Anterior", exact: true }).click();
    await expect(page.getByRole("heading", { name: "R-1-0", exact: true })).toBeVisible();
    // StrictMode may issue an initial GET twice; the navigation must still request 2 then 1.
    expect(state.calls.slice(-2).map(url => url.searchParams.get("page"))).toEqual(["2", "1"]);
    expect(state.writes).toEqual([]);
});
test("filters reset page and send state and both activity values to the API", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByRole("heading", { name: "R-2-0", exact: true })).toBeVisible();
    await page.getByLabel("Estado operacional").selectOption("STARTED");
    await expect(page.getByText("Em andamento", { exact: true }).last()).toBeVisible();
    await page.getByLabel("Atividade", { exact: true }).selectOption("false");
    await expect.poll(() => state.calls.at(-1)?.searchParams.get("active")).toBe("false");
    await page.getByLabel("Atividade", { exact: true }).selectOption("true");
    await expect.poll(() => state.calls.at(-1)?.searchParams.get("active")).toBe("true");
    expect(state.calls.at(-1)?.searchParams.get("page")).toBe("1");
    expect(state.calls.at(-1)?.searchParams.get("state")).toBe("STARTED");
    await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
    await expect(page.getByText("26", { exact: true })).toBeVisible();
    expect(state.calls.at(-1)?.searchParams.has("active")).toBe(false);
    expect(state.calls.at(-1)?.searchParams.has("state")).toBe(false);
});
test("shows loading, empty and retry after a network error without fabricated totals", async ({ page }) => {
    const state = await setup(page); state.delay = 500; state.network = true;
    await page.goto(path);
    await expect(page.getByText("Consultando rotas…", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("conectar ao Backend");
    await expect(page.getByText("Rotas encontradas", { exact: true })).toHaveCount(0);
    state.network = false; state.empty = true; state.delay = 0;
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nenhuma rota encontrada" })).toBeVisible();
    await expect(page.getByText("0", { exact: true })).toBeVisible();
});
test("denied route access is explicit and does not display old data", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await expect(page.getByText("26", { exact: true })).toBeVisible();
    state.status = 403;
    await page.getByRole("button", { name: "Atualizar rotas", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Sem autorização");
    await expect(page.getByRole("heading", { name: "R-1-0", exact: true })).toHaveCount(0);
});
test("expired session returns to login through the shared authentication mechanism", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await expect(page.getByText("26", { exact: true })).toBeVisible();
    state.status = 401; state.expire = true;
    await page.getByRole("button", { name: "Atualizar rotas", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("status")).toContainText("Sessão encerrada");
});
for (const width of [320, 390, 768, 1440]) test(`accessible layout without overflow at ${width}px`, async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "R-1-0", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`planning-${width}.png`), fullPage: true });
});
