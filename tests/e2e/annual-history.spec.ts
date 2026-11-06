import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const year = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date()).slice(0, 4));
test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
});

test("ano limita métricas, gráficos e recentes e mantém catálogo atual", async ({ page }) => {
    await page.goto("/fornecedor");
    await page.evaluate(year => {
        const base = { organizationId: "fornecedor-001", customer: "Comprador anual", items: 1, total: 10, status: "Pendente", commercialStatus: "Aguardando aceite" };
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
            { ...base, id: "CURRENT", date: `${year}-01-01` },
            ...Array.from({ length: 6 }, (_, index) => ({ ...base, id: `PAST-${index}`, customer: `Anterior ${index}`, date: `${year - 1}-12-31`, commercialStatus: "Aceito", custodyStatus: "Aguardando separação" })),
            { ...base, id: "EARLY", date: `${year - 1}-01-01` },
            { ...base, id: "FOREIGN", date: `${year - 3}-01-01`, organizationId: "fornecedor-002" },
        ]));
    }, year);
    await page.reload();
    await expect(page.getByLabel("Ano do Dashboard")).toHaveValue(String(year));
    await expect(page.getByLabel("Ano do Dashboard").getByRole("option")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Pedidos recebidos: 1. Ver pedidos", exact: true })).toBeVisible();
    const catalog = page.getByRole("region", { name: "Situação do catálogo", exact: true });
    await expect(catalog.getByRole("list")).toBeVisible();
    const catalogBefore = await catalog.innerText();
    await page.getByLabel("Ano do Dashboard").selectOption(String(year - 1));
    await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Em preparação: 6. Ver pedidos", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pedidos por situação", exact: true }).getByRole("list")).toContainText("Aceitos: 6");
    await expect(page.getByRole("row").filter({ hasText: "Anterior" })).toHaveCount(5);
    await expect(page.getByRole("row").filter({ hasText: "Comprador anual" })).toHaveCount(0);
    for (const days of [7, 30, 90]) {
        await page.getByLabel("Período", { exact: true }).selectOption(String(days));
        await expect(page.getByText(`6 pedidos recebidos no período, até 31/12/${year - 1}.`, { exact: true })).toBeVisible();
        await page.getByText("Consultar valores por dia", { exact: true }).click();
        const rows = page.getByRole("region", { name: "Valores diários de pedidos" }).getByRole("row");
        await expect(rows).toHaveCount(days + 1);
        await expect(rows.last()).toContainText(`31/12/${year - 1}`);
        await page.getByText("Consultar valores por dia", { exact: true }).click();
    }
    expect(await catalog.innerText()).toBe(catalogBefore);
    await page.reload();
    await expect(page.getByLabel("Ano do Dashboard")).toHaveValue(String(year));
    await page.evaluate(year => {
        const orders = JSON.parse(localStorage.getItem("rotalog:supplier-orders:v1")!);
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify(orders.filter((order: { date: string }) => !order.date.startsWith(String(year)))));
    }, year);
    await page.reload();
    await expect(page.getByText(`Nenhum pedido em ${year} para esta organização.`, { exact: true })).toBeVisible();
});

for (const width of [1440, 360]) {
    test(`histórico mensal, filtros, paginação, detalhes, teclado e persistência em ${width}px`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/fornecedor/pedidos");
        const snapshot = await page.evaluate(() => {
            const base = { organizationId: "fornecedor-001", customer: "Comprador histórico", items: 1, total: 20, date: "2026-10-20", status: "Pendente", commercialStatus: "Aceito" };
            const orders = [
                { ...base, id: "ACTIVE", customer: "Comprador ativo", commercialStatus: "Aguardando aceite" },
                ...Array.from({ length: 22 }, (_, index) => ({ ...base, id: `DONE-${String(index).padStart(3, "0")}`, date: "2026-01-01", completedAt: "2026-10-20T12:00:00Z", custodyStatus: "Entregue" })),
                { ...base, id: "REFUSED", date: "2026-09-01", commercialStatus: "Recusado", rejection: { reason: "Outro motivo", justification: "Produto fora de linha", rejectedAt: "2026-09-01T12:00:00Z" } },
                { ...base, id: "OLDER", date: "2025-12-31", status: "Entregue" },
                { ...base, id: "FOREIGN", customer: "Não deve aparecer", organizationId: "fornecedor-002", status: "Entregue" },
            ];
            const snapshot = JSON.stringify(orders);
            localStorage.setItem("rotalog:supplier-orders:v1", snapshot);
            return snapshot;
        });
        await page.reload();
        await expect(page.getByRole("tabpanel", { name: /^Pedidos ativos/ }).locator("article")).toHaveCount(1);
        await expect(page.locator("#supplier-orders-completed")).toHaveCount(0);
        await page.getByRole("tab", { name: /^Pedidos ativos/ }).focus();
        await page.keyboard.press("ArrowRight");
        const history = page.getByRole("tab", { name: /^Histórico/ });
        await expect(history).toBeFocused();
        await expect(history).toHaveAttribute("aria-selected", "true");
        const section = page.getByRole("region", { name: "Histórico de pedidos", exact: true });
        await expect(section.locator("summary")).toHaveCount(3);
        await expect(section.locator("summary").nth(0)).toContainText("outubro de 2026");
        await expect(section.locator("summary").nth(0)).toContainText("22 pedidos");
        await expect(section.locator("summary").last()).toContainText("Conclusão/recusa não informada");
        await expect(section.getByText("Comprador ativo", { exact: true })).toHaveCount(0);
        await expect(section.getByText("Não deve aparecer", { exact: true })).toHaveCount(0);
        const october = page.getByRole("region", { name: "Pedidos de outubro de 2026", exact: true });
        await expect(october.getByRole("row")).toHaveCount(21);
        await section.getByRole("button", { name: "Próxima", exact: true }).click();
        await expect(october.getByRole("row")).toHaveCount(3);
        await section.locator("summary").first().focus();
        await page.keyboard.press("Enter");
        await expect(october).toBeHidden();
        await page.keyboard.press("Enter");
        await expect(october).toBeVisible();
        await section.getByLabel("Situação do histórico", { exact: true }).selectOption("refused");
        await expect(section.locator("summary")).toHaveCount(1);
        await expect(section.getByText("Outro motivo: Produto fora de linha", { exact: true })).toBeVisible();
        await section.getByRole("button", { name: "Ver detalhes do pedido REFUSED", exact: true }).click();
        await expect(page.getByRole("dialog")).toContainText("Produto fora de linha");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await section.getByRole("button", { name: "Limpar filtros do histórico" }).click();
        await section.getByLabel("De", { exact: true }).fill("2026-09-01");
        await section.getByLabel("Até", { exact: true }).fill("2026-09-30");
        await expect(section.locator("summary")).toHaveCount(1);
        await page.getByLabel("Pesquisar pedido ou cliente", { exact: true }).fill("REFUSED");
        await expect(section.getByRole("row")).toHaveCount(2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const violations = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(violations.violations).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`history-${width}.png`), fullPage: true });
        expect(await page.evaluate(() => localStorage.getItem("rotalog:supplier-orders:v1"))).toBe(snapshot);
        await page.reload();
        await page.getByRole("tab", { name: /^Histórico/ }).click();
        await expect(page.getByRole("region", { name: "Histórico de pedidos", exact: true }).locator("summary")).toHaveCount(3);
        expect(await page.evaluate(() => localStorage.getItem("rotalog:supplier-orders:v1"))).toBe(snapshot);
    });
}

test("recusa real sai dos ativos e aparece no histórico de outra aba sem recarga", async ({ page, context }) => {
    await page.goto("/fornecedor/pedidos");
    const mirror = await context.newPage();
    await mirror.goto("/fornecedor/pedidos");
    await page.evaluate(() => localStorage.setItem("rotalog:supplier-orders:v1", "[]"));
    await page.reload();
    await mirror.getByRole("tab", { name: /^Histórico/ }).click();
    await expect(mirror.getByText("Nenhum pedido finalizado corresponde à pesquisa e aos filtros.")).toBeVisible();
    await page.getByRole("button", { name: "+ Pedido de teste", exact: true }).click();
    await page.getByRole("button", { name: /^Recusar pedido/ }).click();
    await page.getByRole("dialog").getByLabel("Motivo", { exact: true }).selectOption("Outro motivo");
    await page.getByRole("dialog").getByLabel("Justificativa", { exact: true }).fill("Recusa de validação");
    await page.getByRole("button", { name: "Confirmar recusa", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("tabpanel", { name: /^Pedidos ativos/ }).locator("article")).toHaveCount(0);
    await expect(mirror.getByRole("row").filter({ hasText: "Recusa de validação" })).toHaveCount(1);
    await expect(mirror.getByRole("button", { name: /^Aceitar pedido|^Recusar pedido/ })).toHaveCount(0);
    await test.step("histórico persiste após recarregar a aba espelho", async () => {
        await mirror.reload({ waitUntil: "domcontentloaded" });
        await mirror.getByRole("tab", { name: /^Histórico/ }).click();
        await expect(mirror.getByRole("row").filter({ hasText: "Recusa de validação" })).toHaveCount(1);
    });
    await test.step("outra organização não vê a recusa", async () => {
        const controls = mirror.getByText("Controles de desenvolvimento", { exact: true });
        await controls.focus();
        if (!(await controls.evaluate(element => element.parentElement?.hasAttribute("open")))) await controls.press("Enter");
        await expect(mirror.getByLabel("Organização ativa", { exact: true })).toBeVisible();
        await mirror.getByLabel("Organização ativa", { exact: true }).selectOption("fornecedor-002");
        await expect(mirror.getByText("Nenhum pedido finalizado corresponde à pesquisa e aos filtros.")).toBeVisible();
        await expect(mirror.getByRole("row").filter({ hasText: "Recusa de validação" })).toHaveCount(0);
    });
});
