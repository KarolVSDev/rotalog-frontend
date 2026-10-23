# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: order-acceptance-review.spec.ts >> prazo real tem fuso e contador; ausência e valores inválidos são explícitos
- Location: tests\e2e\order-acceptance-review.spec.ts:8:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.reload: Test timeout of 30000ms exceeded.
Call log:
  - waiting for navigation until "load"
    - navigated to "http://127.0.0.1:5174/fornecedor/pedidos"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import AxeBuilder from "@axe-core/playwright";
  3  | 
  4  | test.beforeEach(async ({ context }) => {
  5  |     await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
  6  | });
  7  | 
  8  | test("prazo real tem fuso e contador; ausência e valores inválidos são explícitos", async ({ page }) => {
  9  |     await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  10 |     await page.goto("/fornecedor/pedidos");
  11 |     await page.evaluate(() => {
  12 |         const base = { organizationId: "fornecedor-001", customer: "Revisão de prazo", date: "2026-10-20", total: 1, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite", financialStatus: "Pendente", custodyStatus: "Aguardando separação" };
  13 |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
  14 |             { ...base, id: "TIMED", acceptanceDeadline: "2026-10-20T09:00:00-04:00", timeZone: "America/Manaus" },
  15 |             { ...base, id: "NO-DEADLINE" },
  16 |             { ...base, id: "BAD-DEADLINE", acceptanceDeadline: "invalid", timeZone: "invalid-zone" },
  17 |         ]));
  18 |     });
> 19 |     await page.reload();
     |                ^ Error: page.reload: Test timeout of 30000ms exceeded.
  20 |     const timed = page.locator("article").filter({ has: page.getByRole("heading", { name: "TIMED", exact: true }) });
  21 |     await expect(timed).toContainText("Fuso do pedido: America/Manaus.");
  22 |     await expect(timed.getByRole("timer")).toBeVisible();
  23 |     const before = await timed.getByRole("timer").innerText();
  24 |     await page.clock.runFor(1000);
  25 |     await expect(timed.getByRole("timer")).not.toHaveText(before);
  26 |     await timed.getByRole("button", { name: "Ver detalhes do pedido TIMED", exact: true }).click();
  27 |     await expect(page.getByRole("dialog").getByRole("timer")).toBeVisible();
  28 |     await page.keyboard.press("Escape");
  29 |     const absent = page.locator("article").filter({ has: page.getByRole("heading", { name: "NO-DEADLINE", exact: true }) });
  30 |     await expect(absent).toContainText("Prazo para aceite não informado.");
  31 |     await expect(absent.getByRole("timer")).toHaveCount(0);
  32 |     await absent.getByRole("button", { name: /^Ver detalhes/ }).click();
  33 |     await expect(page.getByRole("dialog")).toContainText("Prazo para aceite não informado.");
  34 |     await expect(page.getByRole("dialog")).toContainText("Fuso do pedido não informado.");
  35 |     await page.keyboard.press("Escape");
  36 |     const invalid = page.locator("article").filter({ has: page.getByRole("heading", { name: "BAD-DEADLINE", exact: true }) });
  37 |     await expect(invalid).toContainText("Prazo para aceite inválido ou sem fuso explícito.");
  38 |     await expect(invalid).toContainText("Fuso do pedido inválido.");
  39 |     await page.clock.fastForward(3_600_000);
  40 |     await expect(timed.getByRole("timer")).toHaveText("Prazo encerrado");
  41 |     await expect(timed.getByRole("button", { name: /^Aceitar pedido/ })).toBeEnabled();
  42 | });
  43 | 
  44 | test("estados são independentes e pedido antigo não recebe custódia inferida do Kanban", async ({ page }, testInfo) => {
  45 |     await page.goto("/fornecedor/pedidos");
  46 |     await page.evaluate(() => {
  47 |         const base = { organizationId: "fornecedor-001", customer: "Revisão de estados", date: "2026-10-20", total: 1, items: 1, status: "Pendente" };
  48 |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
  49 |             { ...base, id: "SEPARATE", commercialStatus: "Aceito", financialStatus: "Pendente", custodyStatus: "Em separação" },
  50 |             { ...base, id: "LEGACY", status: "Em transporte" },
  51 |             { ...base, id: "REFUSED-STATE", commercialStatus: "Recusado", financialStatus: "Aprovado", custodyStatus: "Aguardando separação" },
  52 |         ]));
  53 |     });
  54 |     await page.reload();
  55 |     await page.getByRole("button", { name: "Ver detalhes do pedido SEPARATE", exact: true }).click();
  56 |     const tracking = page.getByRole("region", { name: "Acompanhamento", exact: true });
  57 |     await expect(tracking.getByText("Aceito", { exact: true })).toBeVisible();
  58 |     await expect(tracking.getByText("Pendente", { exact: true })).toBeVisible();
  59 |     await expect(tracking.getByText("Em separação", { exact: true })).toBeVisible();
  60 |     await page.keyboard.press("Escape");
  61 |     await page.getByRole("button", { name: "Ver detalhes do pedido LEGACY", exact: true }).click();
  62 |     await expect(tracking.getByText("Não informado", { exact: true })).toHaveCount(3);
  63 |     await page.keyboard.press("Escape");
  64 |     await page.getByRole("tab", { name: /^Histórico/ }).click();
  65 |     await expect(page.locator("summary").filter({ hasText: "Conclusão/recusa não informada" })).toBeVisible();
  66 |     await page.getByRole("button", { name: "Ver detalhes do pedido REFUSED-STATE", exact: true }).click();
  67 |     await expect(tracking.getByText("Recusado", { exact: true })).toBeVisible();
  68 |     await expect(tracking.getByText("Aprovado", { exact: true })).toBeVisible();
  69 |     await expect(tracking.getByText("Aguardando separação", { exact: true })).toBeVisible();
  70 |     expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  71 |     await page.screenshot({ path: testInfo.outputPath("independent-states.png"), fullPage: true });
  72 | });
  73 | 
```