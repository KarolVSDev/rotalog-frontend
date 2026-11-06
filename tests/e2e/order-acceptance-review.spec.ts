import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
});

test("prazo real tem fuso e contador; ausência e valores inválidos são explícitos", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
    await page.goto("/fornecedor/pedidos");
    await page.evaluate(() => {
        const base = { organizationId: "fornecedor-001", customer: "Revisão de prazo", date: "2026-10-20", total: 1, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite", financialStatus: "Pendente", custodyStatus: "Aguardando separação" };
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
            { ...base, id: "TIMED", acceptanceDeadline: "2026-10-20T09:00:00-04:00", timeZone: "America/Manaus" },
            { ...base, id: "NO-DEADLINE" },
            { ...base, id: "BAD-DEADLINE", acceptanceDeadline: "invalid", timeZone: "invalid-zone" },
        ]));
    });
    await page.reload();
    const timed = page.locator("article").filter({ has: page.getByRole("heading", { name: "TIMED", exact: true }) });
    await expect(timed).toContainText("Fuso do pedido: America/Manaus.");
    await expect(timed.getByRole("timer")).toBeVisible();
    const before = await timed.getByRole("timer").innerText();
    await page.clock.runFor(1000);
    await expect(timed.getByRole("timer")).not.toHaveText(before);
    await timed.getByRole("button", { name: "Ver detalhes do pedido TIMED", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("timer")).toBeVisible();
    await page.keyboard.press("Escape");
    const absent = page.locator("article").filter({ has: page.getByRole("heading", { name: "NO-DEADLINE", exact: true }) });
    await expect(absent).toContainText("Prazo para aceite não informado.");
    await expect(absent.getByRole("timer")).toHaveCount(0);
    await absent.getByRole("button", { name: /^Ver detalhes/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Prazo para aceite não informado.");
    await expect(page.getByRole("dialog")).toContainText("Fuso do pedido não informado.");
    await page.keyboard.press("Escape");
    const invalid = page.locator("article").filter({ has: page.getByRole("heading", { name: "BAD-DEADLINE", exact: true }) });
    await expect(invalid).toContainText("Prazo para aceite inválido ou sem fuso explícito.");
    await expect(invalid).toContainText("Fuso do pedido inválido.");
    await page.clock.fastForward(3_600_000);
    await expect(timed.getByRole("timer")).toHaveText("Prazo encerrado");
    await expect(timed.getByRole("button", { name: /^Aceitar pedido/ })).toBeEnabled();
});

test("estados são independentes e pedido antigo não recebe custódia inferida do Kanban", async ({ page }, testInfo) => {
    await page.goto("/fornecedor/pedidos");
    await page.evaluate(() => {
        const base = { organizationId: "fornecedor-001", customer: "Revisão de estados", date: "2026-10-20", total: 1, items: 1, status: "Pendente" };
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
            { ...base, id: "SEPARATE", commercialStatus: "Aceito", financialStatus: "Pendente", custodyStatus: "Em separação" },
            { ...base, id: "LEGACY", status: "Em transporte" },
            { ...base, id: "REFUSED-STATE", commercialStatus: "Recusado", financialStatus: "Aprovado", custodyStatus: "Aguardando separação" },
        ]));
    });
    await page.reload();
    await page.getByRole("button", { name: "Ver detalhes do pedido SEPARATE", exact: true }).click();
    const tracking = page.getByRole("region", { name: "Acompanhamento", exact: true });
    await expect(tracking.getByText("Aceito", { exact: true })).toBeVisible();
    await expect(tracking.getByText("Pendente", { exact: true })).toBeVisible();
    await expect(tracking.getByText("Em separação", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ver detalhes do pedido LEGACY", exact: true }).click();
    await expect(tracking.getByText("Não informado", { exact: true })).toHaveCount(3);
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: /^Histórico/ }).click();
    await expect(page.locator("summary").filter({ hasText: "Conclusão/recusa não informada" })).toBeVisible();
    await page.getByRole("button", { name: "Ver detalhes do pedido REFUSED-STATE", exact: true }).click();
    await expect(tracking.getByText("Recusado", { exact: true })).toBeVisible();
    await expect(tracking.getByText("Aprovado", { exact: true })).toBeVisible();
    await expect(tracking.getByText("Aguardando separação", { exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("independent-states.png"), fullPage: true });
});
