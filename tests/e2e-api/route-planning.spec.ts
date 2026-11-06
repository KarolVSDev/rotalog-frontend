import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { planFixture, planId } from "../fixtures/route-plan";
import { routeFixture } from "../fixtures/planning";

async function setup(page: Page) {
    const state = { fleetStatus: 200, fleetDelay: 0, empty: false, planStatus: 200, approveStatus: 200, createNetwork: false,
        plan: structuredClone(planFixture), writes: [] as { path: string; key: string; body: unknown }[] };
    const user = { id: "planner", name: "Planejador teste", email: "planner@example.invalid", role: "ROUTE_PLANNER", organization_id: "org", organizations: [{ id: "org", name: "Fornecedor teste", role: "ROUTE_PLANNER" }], capabilities: ["route:plan", "route:publish", "fleet:manage"], demo_run_id: "demo", is_synthetic: true };
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", async route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        if (path === "/api/v1/auth/refresh") return route.fulfill({ json: { access_token: "access", expires_in: 600, csrf_token: "csrf", user } });
        if (path === "/api/v1/me") return route.fulfill({ json: user });
        expect(request.headers()["x-organization-id"]).toBe("org");
        if (path === "/api/v1/routes") return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 25, is_synthetic: true } });
        if (path === "/api/v1/drivers" || path === "/api/v1/vehicles") {
            if (state.fleetDelay) await new Promise(resolve => setTimeout(resolve, state.fleetDelay));
            if (state.fleetStatus !== 200) return route.fulfill({ status: state.fleetStatus });
            return route.fulfill({ json: state.empty ? [] : path.endsWith("drivers") ? [{ id: "driver", name: "Motorista teste", is_synthetic: true }] : [{ id: "vehicle", registration: "DEMO-TEST", package_units: 100, weight_grams: 10000, volume_cm3: 20000, is_synthetic: true }] });
        }
        if (request.method() === "POST") {
            state.writes.push({ path, key: request.headers()["idempotency-key"], body: request.postDataJSON() });
            if (path === "/api/v1/route-plan-versions") {
                if (state.createNetwork) return route.abort();
                return route.fulfill({ status: 201, json: state.plan });
            }
            if (path.endsWith("/approve")) {
                if (state.approveStatus !== 200) return route.fulfill({ status: state.approveStatus, json: { error: { code: "VERSION_CONFLICT" } } });
                expect(request.postDataJSON()).toEqual({ expected_version: state.plan.version });
                state.plan = { ...state.plan, state: "APPROVED", version: state.plan.version + 1 };
                return route.fulfill({ json: state.plan });
            }
            if (path.endsWith("/publish")) {
                expect(request.postDataJSON()).toEqual({ expected_version: state.plan.version });
                return route.fulfill({ json: routeFixture });
            }
        }
        if (path === `/api/v1/route-plan-versions/${planId}`) return route.fulfill({ status: state.planStatus, json: state.plan });
        throw new Error(`Unexpected endpoint ${path}`);
    });
    return state;
}
async function open(page: Page) {
    await page.goto("/fornecedor/planejamento");
    await page.getByRole("button", { name: "Planejar nova rota", exact: true }).click();
    await expect(page.getByLabel("Motorista", { exact: true })).toBeEnabled();
}
async function fill(page: Page) {
    await page.getByLabel("Motorista", { exact: true }).selectOption("driver");
    await page.getByLabel("Veículo", { exact: true }).selectOption("vehicle");
    await page.getByLabel("Endereço", { exact: true }).fill("Destino sintético de teste");
    await page.getByLabel("Latitude", { exact: true }).fill("-3.100000");
    await page.getByLabel("Longitude", { exact: true }).fill("-60.000000");
    await page.getByLabel("Início da janela", { exact: true }).fill("2099-11-03T08:00");
    await page.getByLabel("Fim da janela", { exact: true }).fill("2099-11-03T12:00");
    await page.getByLabel("Justificativa", { exact: true }).fill("Justificativa sintética de teste");
}
test("visual draft validates, reviews and cannot send unverified cargo", async ({ page }) => {
    const state = await setup(page); await open(page);
    await expect(page.getByLabel("Origem/depósito", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Lotes elegíveis", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Revisar preenchimento" }).click();
    await expect(page.getByRole("alert")).toContainText("Selecione motorista");
    await fill(page);
    await page.getByLabel("Latitude", { exact: true }).fill("91");
    await page.getByRole("button", { name: "Revisar preenchimento" }).click();
    await expect(page.getByRole("alert")).toContainText("latitude válida");
    await page.getByLabel("Latitude", { exact: true }).fill("-3.100000");
    await page.getByRole("button", { name: "Revisar preenchimento" }).click();
    await expect(page.getByRole("heading", { name: "Revisão da proposta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar proposta", exact: true })).toBeDisabled();
    expect(state.writes).toEqual([]);
    await page.getByRole("button", { name: /Voltar ao planejamento/ }).click();
    await expect(page.getByRole("button", { name: "Planejar nova rota", exact: true })).toBeFocused();
});
test("existing proposal is readable but commands remain blocked", async ({ page }) => {
    const state = await setup(page); await open(page);
    await page.getByLabel("Identificador da proposta").fill(planId);
    await page.getByRole("button", { name: "Consultar proposta", exact: true }).click();
    await expect(page.getByText(planId, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeDisabled();
    expect(state.writes).toEqual([]);
});
test("fleet loading, failure and empty results have explicit recovery", async ({ page }) => {
    const state = await setup(page); state.fleetDelay = 600; state.fleetStatus = 403;
    await page.goto("/fornecedor/planejamento"); await page.getByRole("button", { name: "Planejar nova rota", exact: true }).click();
    await expect(page.getByText("Consultando motoristas e veículos…")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Sem autorização");
    state.fleetStatus = 200; state.empty = true; state.fleetDelay = 0;
    await page.getByRole("button", { name: "Tentar consultar frota novamente" }).click();
    await expect(page.getByText("Nenhum motorista retornado pela API.")).toBeVisible();
});
test("delivery order is editable locally before reviewing", async ({ page }) => {
    await setup(page); await open(page); await fill(page);
    await page.getByRole("button", { name: "Adicionar entrega" }).click();
    await page.getByLabel("Endereço", { exact: true }).nth(1).fill("Segundo destino de teste");
    await page.getByRole("button", { name: "Mover entrega 2 para cima" }).click();
    await expect(page.getByLabel("Endereço", { exact: true }).nth(0)).toHaveValue("Segundo destino de teste");
});
// These two tests mount an isolated test entry with intercepted eligible cargo.
// The production application never supplies eligibility and keeps commands disabled.
test("isolated workflow creates, approves and publishes with versions and distinct keys", async ({ page }) => {
    const state = await setup(page);
    await page.goto("/tests/fixtures/plan-workflow.html");
    await page.getByRole("button", { name: "Criar proposta", exact: true }).click();
    await page.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
    await page.getByRole("button", { name: "Publicar para o motorista", exact: true }).click();
    await expect(page).toHaveTitle("Publicada test-route");
    expect(state.writes).toHaveLength(3);
    expect(new Set(state.writes.map(write => write.key)).size).toBe(3);
});
test("isolated workflow retains create idempotency and reconciles a version conflict", async ({ page }) => {
    const state = await setup(page); state.createNetwork = true;
    await page.goto("/tests/fixtures/plan-workflow.html");
    await page.getByRole("button", { name: "Criar proposta", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar");
    expect(state.writes).toHaveLength(1); state.createNetwork = false;
    await page.getByRole("button", { name: "Repetir tentativa de criação" }).click();
    await expect(page.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeVisible();
    expect(state.writes[0]).toEqual(state.writes[1]);
    state.approveStatus = 409;
    await page.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Conflito de versão");
    state.plan.version = 2; state.approveStatus = 200;
    await page.getByRole("button", { name: "Consultar proposta novamente" }).click();
    await page.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
    await expect(page.getByRole("button", { name: "Publicar para o motorista", exact: true })).toBeVisible();
    expect(state.writes.at(-1)?.body).toEqual({ expected_version: 2 });
});
for (const width of [320, 390, 768, 1440]) test(`planning preview accessible at ${width}px`, async ({ page }, testInfo) => {
    await setup(page); await page.setViewportSize({ width, height: 900 }); await open(page); await fill(page);
    await page.getByRole("button", { name: "Revisar preenchimento" }).click();
    await expect(page.getByRole("heading", { name: "Revisão da proposta" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`planning-form-${width}.png`), fullPage: true });
});
