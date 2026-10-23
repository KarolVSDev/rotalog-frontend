# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: annual-history.spec.ts >> ano limita métricas, gráficos e recentes e mantém catálogo atual
- Location: tests\e2e\annual-history.spec.ts:9:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Ano do Dashboard')
Expected: "2026"
Error: Test timeout of 30000ms exceeded.

Call log:
  - Expect "toHaveValue" getByLabel('Ano do Dashboard') with timeout 5000ms
  - waiting for getByLabel('Ano do Dashboard')
  - Test timeout of 30000ms exceeded.

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import AxeBuilder from "@axe-core/playwright";
  3   | 
  4   | const year = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date()).slice(0, 4));
  5   | test.beforeEach(async ({ context }) => {
  6   |     await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
  7   | });
  8   | 
  9   | test("ano limita métricas, gráficos e recentes e mantém catálogo atual", async ({ page }) => {
  10  |     await page.goto("/fornecedor");
  11  |     await page.evaluate(year => {
  12  |         const base = { organizationId: "fornecedor-001", customer: "Comprador anual", items: 1, total: 10, status: "Pendente", commercialStatus: "Aguardando aceite" };
  13  |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([
  14  |             { ...base, id: "CURRENT", date: `${year}-01-01` },
  15  |             ...Array.from({ length: 6 }, (_, index) => ({ ...base, id: `PAST-${index}`, customer: `Anterior ${index}`, date: `${year - 1}-12-31`, commercialStatus: "Aceito", custodyStatus: "Aguardando separação" })),
  16  |             { ...base, id: "EARLY", date: `${year - 1}-01-01` },
  17  |             { ...base, id: "FOREIGN", date: `${year - 3}-01-01`, organizationId: "fornecedor-002" },
  18  |         ]));
  19  |     }, year);
  20  |     await page.reload();
> 21  |     await expect(page.getByLabel("Ano do Dashboard")).toHaveValue(String(year));
      |                                                       ^ Error: expect(locator).toHaveValue(expected) failed
  22  |     await expect(page.getByLabel("Ano do Dashboard").getByRole("option")).toHaveCount(2);
  23  |     await expect(page.getByRole("link", { name: "Pedidos recebidos: 1. Ver pedidos", exact: true })).toBeVisible();
  24  |     const catalog = page.getByRole("region", { name: "Situação do catálogo", exact: true });
  25  |     await expect(catalog.getByRole("list")).toBeVisible();
  26  |     const catalogBefore = await catalog.innerText();
  27  |     await page.getByLabel("Ano do Dashboard").selectOption(String(year - 1));
  28  |     await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
  29  |     await expect(page.getByRole("link", { name: "Em preparação: 6. Ver pedidos", exact: true })).toBeVisible();
  30  |     await expect(page.getByRole("region", { name: "Pedidos por situação", exact: true }).getByRole("list")).toContainText("Aceitos: 6");
  31  |     await expect(page.getByRole("row").filter({ hasText: "Anterior" })).toHaveCount(5);
  32  |     await expect(page.getByRole("row").filter({ hasText: "Comprador anual" })).toHaveCount(0);
  33  |     for (const days of [7, 30, 90]) {
  34  |         await page.getByLabel("Período", { exact: true }).selectOption(String(days));
  35  |         await expect(page.getByText(`6 pedidos recebidos no período, até 31/12/${year - 1}.`, { exact: true })).toBeVisible();
  36  |         await page.getByText("Consultar valores por dia", { exact: true }).click();
  37  |         const rows = page.getByRole("region", { name: "Valores diários de pedidos" }).getByRole("row");
  38  |         await expect(rows).toHaveCount(days + 1);
  39  |         await expect(rows.last()).toContainText(`31/12/${year - 1}`);
  40  |         await page.getByText("Consultar valores por dia", { exact: true }).click();
  41  |     }
  42  |     expect(await catalog.innerText()).toBe(catalogBefore);
  43  |     await page.reload();
  44  |     await expect(page.getByLabel("Ano do Dashboard")).toHaveValue(String(year));
  45  |     await page.evaluate(year => {
  46  |         const orders = JSON.parse(localStorage.getItem("rotalog:supplier-orders:v1")!);
  47  |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify(orders.filter((order: { date: string }) => !order.date.startsWith(String(year)))));
  48  |     }, year);
  49  |     await page.reload();
  50  |     await expect(page.getByText(`Nenhum pedido em ${year} para esta organização.`, { exact: true })).toBeVisible();
  51  | });
  52  | 
  53  | for (const width of [1440, 360]) {
  54  |     test(`histórico mensal, filtros, paginação, detalhes, teclado e persistência em ${width}px`, async ({ page }, testInfo) => {
  55  |         test.setTimeout(120_000);
  56  |         await page.setViewportSize({ width, height: 900 });
  57  |         await page.goto("/fornecedor/pedidos");
  58  |         const snapshot = await page.evaluate(() => {
  59  |             const base = { organizationId: "fornecedor-001", customer: "Comprador histórico", items: 1, total: 20, date: "2026-10-20", status: "Pendente", commercialStatus: "Aceito" };
  60  |             const orders = [
  61  |                 { ...base, id: "ACTIVE", customer: "Comprador ativo", commercialStatus: "Aguardando aceite" },
  62  |                 ...Array.from({ length: 22 }, (_, index) => ({ ...base, id: `DONE-${String(index).padStart(3, "0")}`, date: "2026-01-01", completedAt: "2026-10-20T12:00:00Z", custodyStatus: "Entregue" })),
  63  |                 { ...base, id: "REFUSED", date: "2026-09-01", commercialStatus: "Recusado", rejection: { reason: "Outro motivo", justification: "Produto fora de linha", rejectedAt: "2026-09-01T12:00:00Z" } },
  64  |                 { ...base, id: "OLDER", date: "2025-12-31", status: "Entregue" },
  65  |                 { ...base, id: "FOREIGN", customer: "Não deve aparecer", organizationId: "fornecedor-002", status: "Entregue" },
  66  |             ];
  67  |             const snapshot = JSON.stringify(orders);
  68  |             localStorage.setItem("rotalog:supplier-orders:v1", snapshot);
  69  |             return snapshot;
  70  |         });
  71  |         await page.reload();
  72  |         await expect(page.getByRole("tabpanel", { name: /^Pedidos ativos/ }).locator("article")).toHaveCount(1);
  73  |         await expect(page.locator("#supplier-orders-completed")).toHaveCount(0);
  74  |         await page.getByRole("tab", { name: /^Pedidos ativos/ }).focus();
  75  |         await page.keyboard.press("ArrowRight");
  76  |         const history = page.getByRole("tab", { name: /^Histórico/ });
  77  |         await expect(history).toBeFocused();
  78  |         await expect(history).toHaveAttribute("aria-selected", "true");
  79  |         const section = page.getByRole("region", { name: "Histórico de pedidos", exact: true });
  80  |         await expect(section.locator("summary")).toHaveCount(3);
  81  |         await expect(section.locator("summary").nth(0)).toContainText("outubro de 2026");
  82  |         await expect(section.locator("summary").nth(0)).toContainText("22 pedidos");
  83  |         await expect(section.locator("summary").last()).toContainText("Conclusão/recusa não informada");
  84  |         await expect(section.getByText("Comprador ativo", { exact: true })).toHaveCount(0);
  85  |         await expect(section.getByText("Não deve aparecer", { exact: true })).toHaveCount(0);
  86  |         const october = page.getByRole("region", { name: "Pedidos de outubro de 2026", exact: true });
  87  |         await expect(october.getByRole("row")).toHaveCount(21);
  88  |         await section.getByRole("button", { name: "Próxima", exact: true }).click();
  89  |         await expect(october.getByRole("row")).toHaveCount(3);
  90  |         await section.locator("summary").first().focus();
  91  |         await page.keyboard.press("Enter");
  92  |         await expect(october).toBeHidden();
  93  |         await page.keyboard.press("Enter");
  94  |         await expect(october).toBeVisible();
  95  |         await section.getByLabel("Situação do histórico", { exact: true }).selectOption("refused");
  96  |         await expect(section.locator("summary")).toHaveCount(1);
  97  |         await expect(section.getByText("Outro motivo: Produto fora de linha", { exact: true })).toBeVisible();
  98  |         await section.getByRole("button", { name: "Ver detalhes do pedido REFUSED", exact: true }).click();
  99  |         await expect(page.getByRole("dialog")).toContainText("Produto fora de linha");
  100 |         await page.keyboard.press("Escape");
  101 |         await expect(page.getByRole("dialog")).toHaveCount(0);
  102 |         await section.getByRole("button", { name: "Limpar filtros do histórico" }).click();
  103 |         await section.getByLabel("De", { exact: true }).fill("2026-09-01");
  104 |         await section.getByLabel("Até", { exact: true }).fill("2026-09-30");
  105 |         await expect(section.locator("summary")).toHaveCount(1);
  106 |         await page.getByLabel("Pesquisar pedido ou cliente", { exact: true }).fill("REFUSED");
  107 |         await expect(section.getByRole("row")).toHaveCount(2);
  108 |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  109 |         const violations = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  110 |         expect(violations.violations).toEqual([]);
  111 |         await page.screenshot({ path: testInfo.outputPath(`history-${width}.png`), fullPage: true });
  112 |         expect(await page.evaluate(() => localStorage.getItem("rotalog:supplier-orders:v1"))).toBe(snapshot);
  113 |         await page.reload();
  114 |         await page.getByRole("tab", { name: /^Histórico/ }).click();
  115 |         await expect(page.getByRole("region", { name: "Histórico de pedidos", exact: true }).locator("summary")).toHaveCount(3);
  116 |         expect(await page.evaluate(() => localStorage.getItem("rotalog:supplier-orders:v1"))).toBe(snapshot);
  117 |     });
  118 | }
  119 | 
  120 | test("recusa real sai dos ativos e aparece no histórico de outra aba sem recarga", async ({ page, context }) => {
  121 |     await page.goto("/fornecedor/pedidos");
```