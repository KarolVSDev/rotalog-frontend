import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { manifestFixture, routeFixture, trackingFixture, pointFixture } from "../fixtures/planning";

async function setup(page: Page) {
    const state = { detailStatus: 200, manifestStatus: 200, network: false, expire: false, delay: 0,
        role: "ROUTE_PLANNER", capability: true, optional: true, changed: false, trackingStatus: 200, historyStatus: 200,
        position: false, trackingNetwork: false, trackingDelay: 0, calls: [] as string[] };
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        const user = { id: "planner", name: "Planejador teste", email: "planner@example.invalid", role: state.role,
            organization_id: "org", organizations: [{ id: "org", name: "Organização teste", role: state.role }],
            capabilities: state.capability ? state.role === "SUPPLIER_OPERATOR" ? ["supplier_order:manage"] : ["route:plan"] : [], demo_run_id: "demo", is_synthetic: true };
        if (url.pathname === "/api/v1/auth/refresh") return state.expire ? route.fulfill({ status: 401 }) : route.fulfill({ json: { access_token: "access", expires_in: 600, csrf_token: "csrf", user } });
        if (url.pathname === "/api/v1/me") return route.fulfill({ json: user });
        expect(request.method()).toBe("GET");
        state.calls.push(url.pathname);
        expect(request.headers()["x-organization-id"]).toBe("org");
        if (url.pathname.endsWith("/tracking/current")) {
            if (state.trackingDelay) await new Promise(resolve => setTimeout(resolve, state.trackingDelay));
            if (state.trackingNetwork) return route.abort();
            if (state.trackingStatus !== 200) return route.fulfill({ status: state.trackingStatus });
            return route.fulfill({ json: state.position ? { ...trackingFixture, state: "STALE", position: pointFixture } : trackingFixture });
        }
        if (url.pathname.endsWith("/tracking/history")) {
            if (state.historyStatus !== 200) return route.fulfill({ status: state.historyStatus });
            return route.fulfill({ json: { route_id: "test-route", items: state.position ? url.searchParams.has("cursor") ? [pointFixture] : [{ ...pointFixture, id: "later", captured_at_device: "2026-10-29T14:00:00Z" }] : [], next_cursor: state.position && !url.searchParams.has("cursor") ? "next" : null, is_synthetic: true } });
        }
        if (url.pathname === "/api/v1/routes") return route.fulfill({ json: { items: [routeFixture], total: 26,
            page: Number(url.searchParams.get("page")), page_size: 25, is_synthetic: true } });
        if (url.pathname === "/api/v1/routes/test-route") {
            if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
            if (state.network) return route.abort();
            if (state.detailStatus !== 200) return route.fulfill({ status: state.detailStatus });
            return route.fulfill({ json: state.optional ? routeFixture : { ...routeFixture, code: null, scheduled_date: null, vehicle: null, cargo: null, stops: [] } });
        }
        if (url.pathname === "/api/v1/routes/test-route/manifest") {
            if (state.manifestStatus !== 200) return route.fulfill({ status: state.manifestStatus });
            return route.fulfill({ json: state.changed ? { ...manifestFixture, requires_replanning: true, unresolved_issues: 1,
                issues: [{ id: "issue", fulfillment_line_id: "load-line", expected_quantity: 3, observed_quantity: 2,
                    category: "MISSING", reason: "Falta sintética para teste", state: "OPEN", correction: null,
                    reported_by: "driver", resolved_by: null, created_at: "2026-10-29T12:00:00Z", resolved_at: null, photo_ids: [] }] } : manifestFixture });
        }
        throw new Error(`Unexpected endpoint ${url.pathname}`);
    });
    return state;
}
const path = "/fornecedor/planejamento";
async function open(page: Page) {
    await page.goto(path);
    await page.getByRole("button", { name: "Ver detalhes da rota R-TEST", exact: true }).click();
}
test("opens with keyboard, orders stops, displays manifest and restores filters, page and focus", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await page.getByLabel("Estado operacional", { exact: true }).selectOption("PUBLISHED");
    await page.getByLabel("Atividade", { exact: true }).selectOption("true");
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
    const trigger = page.getByRole("button", { name: "Ver detalhes da rota R-TEST", exact: true });
    await trigger.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Detalhes da rota", exact: true })).toBeFocused();
    const stops = page.getByRole("list", { name: "Paradas em ordem" }).getByRole("listitem");
    await expect(stops.nth(0)).toContainText("Sequência 0");
    await expect(stops.nth(0)).toContainText("Coleta");
    await expect(stops.nth(1)).toContainText("Entrega");
    await expect(page.getByText("Produto sintético de teste", { exact: true })).toBeVisible();
    await expect(page.getByText("Carga ainda não conferida", { exact: true })).toBeVisible();
    const count = state.calls.filter(path => path === "/api/v1/routes").length;
    await page.getByRole("button", { name: /Voltar à listagem/ }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByLabel("Estado operacional", { exact: true })).toHaveValue("PUBLISHED");
    await expect(page.getByLabel("Atividade", { exact: true })).toHaveValue("true");
    await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
    expect(state.calls.filter(path => path === "/api/v1/routes").length).toBe(count);
});
test("manifest failure leaves route visible and retries only the manifest", async ({ page }) => {
    const state = await setup(page); state.manifestStatus = 404;
    await open(page);
    await expect(page.getByRole("alert")).toContainText("Manifesto não encontrado");
    await expect(page.getByRole("heading", { name: "R-TEST", exact: true })).toBeVisible();
    const count = state.calls.filter(path => path.endsWith("/test-route")).length;
    state.manifestStatus = 200; state.changed = true;
    await page.getByRole("button", { name: "Tentar carregar manifesto novamente" }).click();
    await expect(page.getByText("Falta sintética para teste", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Replanejamento necessário");
    await expect(page.getByText("Falta · Pendente", { exact: true })).toBeVisible();
    expect(state.calls.filter(path => path.endsWith("/test-route")).length).toBe(count);
});
for (const status of [403, 404, 500]) test(`route error ${status} is explicit and recoverable`, async ({ page }) => {
    const state = await setup(page); state.detailStatus = status;
    await open(page);
    await expect(page.getByRole("alert")).toContainText(status === 403 ? "Sem autorização" : status === 404 ? "Rota não encontrada" : "Não foi possível");
    expect(state.calls.some(path => path.endsWith("/manifest"))).toBe(false);
    state.detailStatus = 200;
    await page.getByRole("button", { name: "Tentar carregar rota novamente" }).click();
    await expect(page.getByText("Produto sintético de teste", { exact: true })).toBeVisible();
});
test("loading and network error recover with absent optional fields", async ({ page }) => {
    const state = await setup(page); state.network = true; state.delay = 500;
    await open(page);
    await expect(page.getByText("Carregando detalhes da rota…", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("conectar ao Backend");
    state.network = false; state.delay = 0; state.optional = false;
    await page.getByRole("button", { name: "Tentar carregar rota novamente" }).click();
    await expect(page.getByRole("heading", { name: "test-route", exact: true })).toBeVisible();
    await expect(page.getByText("Nenhuma parada informada.", { exact: true })).toBeVisible();
    await expect(page.getByText("Não informada", { exact: true }).first()).toBeVisible();
});
test("expired detail session uses the existing login flow", async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    await expect(page.getByRole("button", { name: /Ver detalhes da rota/ })).toBeVisible();
    state.detailStatus = 401; state.expire = true;
    await page.getByRole("button", { name: /Ver detalhes da rota/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("status")).toContainText("Sessão encerrada");
});
test("supplier and planner without capability cannot request route details", async ({ page }) => {
    const state = await setup(page); state.role = "SUPPLIER_OPERATOR";
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText("Acesso não autorizado");
    expect(state.calls).toEqual([]);
    state.role = "ROUTE_PLANNER"; state.capability = false;
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    expect(state.calls).toEqual([]);
});
for (const width of [320, 390, 768, 1440]) test(`details accessible without overflow at ${width}px`, async ({ page }, testInfo) => {
    const state = await setup(page); state.changed = true; state.position = true;
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await expect(page.getByText("Falta sintética para teste", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais posições" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`route-details-${width}.png`), fullPage: true });
});

test("tracking starts empty, refreshes manually and paginates capture-ordered history", async ({ page }) => {
    const state = await setup(page);
    await open(page);
    const section = page.getByRole("region", { name: "Acompanhamento da rota" });
    await expect(section.getByText("Nenhuma localização registrada para esta rota.")).toBeVisible();
    await expect(section.getByText("Histórico sem posições registradas.")).toBeVisible();
    state.position = true;
    await section.getByRole("button", { name: "Atualizar rastreamento" }).click();
    await expect(section.getByText("Posição desatualizada", { exact: true })).toBeVisible();
    await expect(section.getByText("-3.100000", { exact: true }).first()).toBeVisible();
    await section.getByRole("button", { name: "Carregar mais posições" }).click();
    await expect(section.getByText("2 posição(ões) carregada(s)")).toBeVisible();
    const positions = section.getByRole("list", { name: "Posições em ordem cronológica" }).getByRole("listitem");
    await expect(positions.nth(0)).toContainText("29/10/2026, 08:00");
    await expect(positions.nth(1)).toContainText("29/10/2026, 10:00");
    await expect(section.getByRole("button", { name: "Carregar mais posições" })).toHaveCount(0);
    // Advancing browser time must not schedule tracking requests.
    await page.clock.install();
    const count = state.calls.filter(path => path.includes("/tracking/")).length;
    await page.clock.fastForward(90_000);
    expect(state.calls.filter(path => path.includes("/tracking/")).length).toBe(count);
    await page.getByRole("button", { name: /Voltar à listagem/ }).click();
    await page.clock.fastForward(90_000);
    expect(state.calls.filter(path => path.includes("/tracking/")).length).toBe(count);
});
for (const status of [403, 404, 500]) test(`tracking HTTP ${status} preserves route and manifest`, async ({ page }) => {
    const state = await setup(page); state.trackingStatus = status; state.historyStatus = status;
    await open(page);
    const section = page.getByRole("region", { name: "Acompanhamento da rota" });
    await expect(section.getByRole("alert").first()).toContainText(status === 403 ? "Sem autorização" : status === 404 ? "não encontrado" : "Não foi possível");
    await expect(page.getByText("Produto sintético de teste", { exact: true })).toBeVisible();
    state.trackingStatus = 200; state.historyStatus = 200;
    await section.getByRole("button", { name: "Atualizar rastreamento" }).click();
    await expect(section.getByText("Histórico sem posições registradas.")).toBeVisible();
});
test("tracking loading and transport failure support a manual retry", async ({ page }) => {
    const state = await setup(page); state.trackingNetwork = true; state.trackingDelay = 700;
    await open(page);
    const section = page.getByRole("region", { name: "Acompanhamento da rota" });
    await expect(section.getByText("Consultando última posição…")).toBeVisible();
    await expect(section.getByRole("alert")).toContainText("conectar ao Backend");
    state.trackingNetwork = false; state.trackingDelay = 0;
    await section.getByRole("button", { name: "Atualizar rastreamento" }).click();
    await expect(section.getByText("Nenhuma localização registrada para esta rota.")).toBeVisible();
});
test("tracking 401 uses session expiration flow", async ({ page }) => {
    const state = await setup(page);
    await open(page);
    const section = page.getByRole("region", { name: "Acompanhamento da rota" });
    await expect(section.getByText("Histórico sem posições registradas.")).toBeVisible();
    state.trackingStatus = 401; state.expire = true;
    await section.getByRole("button", { name: "Atualizar rastreamento" }).click();
    await expect(page).toHaveURL(/\/login$/);
});
