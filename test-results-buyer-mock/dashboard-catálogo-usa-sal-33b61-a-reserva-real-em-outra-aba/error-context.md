# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> catálogo usa saldo disponível e acompanha reserva real em outra aba
- Location: tests\e2e\dashboard.spec.ts:7:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Situação do catálogo', exact: true }).getByRole('list')
Expected: visible
Error: Test timeout of 30000ms exceeded.

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Situação do catálogo', exact: true }).getByRole('list') with timeout 5000ms
  - waiting for getByRole('region', { name: 'Situação do catálogo', exact: true }).getByRole('list')
  - Test timeout of 30000ms exceeded.

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.beforeEach(async ({ context }) => {
  4  |     await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
  5  | });
  6  | 
  7  | test("catálogo usa saldo disponível e acompanha reserva real em outra aba", async ({ page, context }) => {
  8  |     await page.goto("/fornecedor");
  9  |     const writer = await context.newPage();
  10 |     await writer.goto("/fornecedor/pedidos");
  11 |     await writer.evaluate(() => {
  12 |         const product = { id: "DASH-PRODUCT", organizationId: "fornecedor-001", name: "Produto do teste", category: "Teste", unit: "un", stock: 1, price: 10, availability: "Estoque baixo" };
  13 |         localStorage.setItem("rotalog:supplier-products:v1:fornecedor-001", JSON.stringify([product]));
  14 |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([{ id: "DASH-RESERVA", organizationId: "fornecedor-001", customer: "Reserva Dashboard", date: "2026-10-20", total: 10, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite", orderItems: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: 10 }] }]));
  15 |     });
  16 |     await writer.reload();
  17 |     const catalog = page.getByRole("region", { name: "Situação do catálogo", exact: true });
  18 |     const unavailable = catalog.getByRole("listitem").filter({ hasText: "Indisponíveis:" }).getByRole("strong");
> 19 |     await expect(catalog.getByRole("list")).toBeVisible();
     |                                             ^ Error: expect(locator).toBeVisible() failed
  20 |     const before = Number(await unavailable.innerText());
  21 |     await writer.getByRole("button", { name: /^Aceitar pedido/ }).click();
  22 |     await writer.getByRole("button", { name: "Confirmar aceite", exact: true }).click();
  23 |     await expect(writer.getByRole("dialog")).toHaveCount(0);
  24 |     await expect(unavailable).toHaveText(String(before + 1));
  25 |     await page.reload();
  26 |     await expect(unavailable).toHaveText(String(before + 1));
  27 |     expect(await writer.evaluate(() => JSON.parse(localStorage.getItem("rotalog:supplier-products:v1:fornecedor-001")!)[0].stock)).toBe(1);
  28 | });
  29 | 
  30 | test("painel acompanha pedidos de outra aba, períodos, organização e limite de recentes", async ({ page, context }) => {
  31 |     await page.goto("/fornecedor");
  32 |     const writer = await context.newPage();
  33 |     await writer.goto("/fornecedor/pedidos");
  34 |     const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date());
  35 |     const records = Array.from({ length: 7 }, (_, index) => ({ id: `DASH-${index}`, organizationId: "fornecedor-001", customer: `Comprador ${index}`, date: today, total: 10, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite" }));
  36 |     await writer.evaluate(records => localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([...records, { ...records[0], id: "OTHER", organizationId: "fornecedor-002", customer: "Outra organização" }])), records);
  37 |     await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
  38 |     const stages = page.getByRole("region", { name: "Pedidos por situação", exact: true });
  39 |     await expect(stages.getByRole("list")).toContainText("Novos: 7");
  40 |     await expect(page.getByRole("row").filter({ hasText: "Comprador" })).toHaveCount(5);
  41 |     await expect(page.getByRole("row").filter({ hasText: "Outra organização" })).toHaveCount(0);
  42 |     for (const days of [7, 30, 90]) {
  43 |         await page.getByLabel("Período", { exact: true }).selectOption(String(days));
  44 |         await expect(page.getByText("7 pedidos recebidos no período, incluindo hoje (Manaus).", { exact: true })).toBeVisible();
  45 |         await page.getByText("Consultar valores por dia", { exact: true }).click();
  46 |         await expect(page.getByRole("region", { name: "Valores diários de pedidos" }).getByRole("row")).toHaveCount(days + 1);
  47 |         await page.getByText("Consultar valores por dia", { exact: true }).click();
  48 |     }
  49 |     await writer.evaluate(() => {
  50 |         const records = JSON.parse(localStorage.getItem("rotalog:supplier-orders:v1")!);
  51 |         records[0].commercialStatus = "Recusado";
  52 |         localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify(records));
  53 |     });
  54 |     await expect(stages.getByRole("list")).toContainText("Finalizados: 1");
  55 |     await expect(page.getByRole("link", { name: "Aguardando aceite: 6. Ver pedidos", exact: true })).toBeVisible();
  56 |     await page.reload();
  57 |     await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
  58 |     await writer.evaluate(() => localStorage.setItem("rotalog:supplier-orders:v1", "[]"));
  59 |     await expect(page.getByText("Nenhum pedido para esta organização.")).toBeVisible();
  60 |     await expect(page.getByText("Nenhum pedido recebido neste período.")).toBeVisible();
  61 |     await page.getByRole("link", { name: "Ver todos os pedidos" }).click();
  62 |     await expect(page).toHaveURL(/\/fornecedor\/pedidos$/);
  63 | });
  64 | 
```