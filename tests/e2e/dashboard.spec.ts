import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
});

test("catálogo usa saldo disponível e acompanha reserva real em outra aba", async ({ page, context }) => {
    await page.goto("/fornecedor");
    const writer = await context.newPage();
    await writer.goto("/fornecedor/pedidos");
    await writer.evaluate(() => {
        const product = { id: "DASH-PRODUCT", organizationId: "fornecedor-001", name: "Produto do teste", category: "Teste", unit: "un", stock: 1, price: 10, availability: "Estoque baixo" };
        localStorage.setItem("rotalog:supplier-products:v1:fornecedor-001", JSON.stringify([product]));
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([{ id: "DASH-RESERVA", organizationId: "fornecedor-001", customer: "Reserva Dashboard", date: "2026-10-20", total: 10, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite", orderItems: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: 10 }] }]));
    });
    await writer.reload();
    const catalog = page.getByRole("region", { name: "Situação do catálogo", exact: true });
    const unavailable = catalog.getByRole("listitem").filter({ hasText: "Indisponíveis:" }).getByRole("strong");
    await expect(catalog.getByRole("list")).toBeVisible();
    const before = Number(await unavailable.innerText());
    await writer.getByRole("button", { name: /^Aceitar pedido/ }).click();
    await writer.getByRole("button", { name: "Confirmar aceite", exact: true }).click();
    await expect(writer.getByRole("dialog")).toHaveCount(0);
    await expect(unavailable).toHaveText(String(before + 1));
    await page.reload();
    await expect(unavailable).toHaveText(String(before + 1));
    expect(await writer.evaluate(() => JSON.parse(localStorage.getItem("rotalog:supplier-products:v1:fornecedor-001")!)[0].stock)).toBe(1);
});

test("painel acompanha pedidos de outra aba, períodos, organização e limite de recentes", async ({ page, context }) => {
    await page.goto("/fornecedor");
    const writer = await context.newPage();
    await writer.goto("/fornecedor/pedidos");
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date());
    const records = Array.from({ length: 7 }, (_, index) => ({ id: `DASH-${index}`, organizationId: "fornecedor-001", customer: `Comprador ${index}`, date: today, total: 10, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite" }));
    await writer.evaluate(records => localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([...records, { ...records[0], id: "OTHER", organizationId: "fornecedor-002", customer: "Outra organização" }])), records);
    await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
    const stages = page.getByRole("region", { name: "Pedidos por situação", exact: true });
    await expect(stages.getByRole("list")).toContainText("Novos: 7");
    await expect(page.getByRole("row").filter({ hasText: "Comprador" })).toHaveCount(5);
    await expect(page.getByRole("row").filter({ hasText: "Outra organização" })).toHaveCount(0);
    for (const days of [7, 30, 90]) {
        await page.getByLabel("Período", { exact: true }).selectOption(String(days));
        await expect(page.getByText("7 pedidos recebidos no período, incluindo hoje (Manaus).", { exact: true })).toBeVisible();
        await page.getByText("Consultar valores por dia", { exact: true }).click();
        await expect(page.getByRole("region", { name: "Valores diários de pedidos" }).getByRole("row")).toHaveCount(days + 1);
        await page.getByText("Consultar valores por dia", { exact: true }).click();
    }
    await writer.evaluate(() => {
        const records = JSON.parse(localStorage.getItem("rotalog:supplier-orders:v1")!);
        records[0].commercialStatus = "Recusado";
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify(records));
    });
    await expect(stages.getByRole("list")).toContainText("Finalizados: 1");
    await expect(page.getByRole("link", { name: "Aguardando aceite: 6. Ver pedidos", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Pedidos recebidos: 7. Ver pedidos", exact: true })).toBeVisible();
    await writer.evaluate(() => localStorage.setItem("rotalog:supplier-orders:v1", "[]"));
    await expect(page.getByText("Nenhum pedido para esta organização.")).toBeVisible();
    await expect(page.getByText("Nenhum pedido recebido neste período.")).toBeVisible();
    await page.getByRole("link", { name: "Ver todos os pedidos" }).click();
    await expect(page).toHaveURL(/\/fornecedor\/pedidos$/);
});
