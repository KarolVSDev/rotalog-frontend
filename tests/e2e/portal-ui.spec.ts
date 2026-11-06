import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Page, Locator } from "@playwright/test";

test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
});

const routes = [
    ["dashboard", "/fornecedor"], ["pedidos", "/fornecedor/pedidos"],
    ["produtos", "/fornecedor/produtos"], ["estoque", "/fornecedor/estoque"],
];

async function fitsViewport(page: Page, element: Locator) {
    const box = (await element.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await element.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
}

async function audit(page: Page) {
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    return result.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
}

for (const width of [1440, 1280, 1024, 768, 390, 360]) {
    test(`revisão das quatro páginas em ${width}px`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        const violations: unknown[] = [];
        for (const [name, route] of routes) {
            await page.goto(route);
            await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
            if (name === "dashboard") await expect(page.getByRole("heading", { name: "Pedidos por situação", exact: true })).toBeVisible();
            expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow da página`).toBe(true);
            await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
            for (const violation of await audit(page)) violations.push({ page: name, ...violation });
            if (name === "dashboard") {
                const cards = await page.getByRole("main").locator("article").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
                expect.soft(new Set(cards.map(Math.round)).size, "alturas dos indicadores").toBe(1);
            }
            if (name === "produtos") {
                const trigger = page.getByRole("button", { name: "Novo produto", exact: true });
                await trigger.click();
                const dialog = page.getByRole("dialog", { name: "Novo produto", exact: true });
                await fitsViewport(page, dialog);
                await page.screenshot({ path: testInfo.outputPath(`cadastro-${width}.png`) });
                for (const violation of await audit(page)) violations.push({ page: "cadastro", ...violation });
                await page.keyboard.press("Escape");
                await expect(trigger).toBeFocused();
            }
        }
        await testInfo.attach("accessibility.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
        expect(violations).toEqual([]);
    });
}

for (const width of [390, 360]) {
    test(`drawer acessível e navegação móvel em ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/fornecedor");
        const trigger = page.getByRole("button", { name: "Abrir menu", exact: true });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Menu do fornecedor", exact: true });
        await fitsViewport(page, dialog);
        await expect(dialog.getByRole("button", { name: "Fechar menu", exact: true })).toBeFocused();
        await expect(dialog.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
        await expect(dialog).toContainText("Fornecedor Exemplo");
        expect(await audit(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        for (const [label, route] of [["Pedidos", "/fornecedor/pedidos"], ["Produtos", "/fornecedor/produtos"], ["Estoque", "/fornecedor/estoque"], ["Dashboard", "/fornecedor"]]) {
            await trigger.click();
            await dialog.getByRole("link", { name: new RegExp(`^${label}`) }).click();
            await expect(page).toHaveURL(new RegExp(`${route}$`));
            await expect(dialog).toHaveCount(0);
        }
        await trigger.click();
        await page.setViewportSize({ width: 1024, height: 800 });
        await expect(dialog).toHaveCount(0);
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    });
}

test("modais e filtros no celular: foco, Escape e fundo bloqueado", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/fornecedor/pedidos");
    const filter = page.getByRole("button", { name: "Filtrar Novos", exact: true });
    await filter.click();
    await fitsViewport(page, page.getByRole("dialog", { name: "Filtros de Novos", exact: true }));
    expect(await audit(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(filter).toBeFocused();
    const card = page.locator("#supplier-orders-new article").first();
    for (const action of ["Ver detalhes", "Aceitar", "Recusar"]) {
        const trigger = card.getByRole("button", { name: new RegExp(`^${action}`) });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await fitsViewport(page, dialog);
        await page.locator("#supplier-order-search").evaluate(element => (element as HTMLElement).focus());
        expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
        expect(await audit(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`pedido-${action}.png`) });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
    }
    await page.goto("/fornecedor/produtos");
    const availability = page.getByRole("button", { name: "Filtrar disponibilidade", exact: true });
    await availability.click();
    await fitsViewport(page, page.locator('[popover]:popover-open'));
    await page.keyboard.press("Escape");
    await expect(availability).toBeFocused();
    const detailsTrigger = page.getByRole("button", { name: /^Ver detalhes de/ }).first();
    await detailsTrigger.click();
    const dialog = page.getByRole("dialog");
    await fitsViewport(page, dialog);
    expect(await page.locator("#root").evaluate(node => (node as HTMLElement).inert)).toBe(true);
    await page.locator("#product-search").evaluate(element => (element as HTMLElement).focus());
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    expect(await audit(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(detailsTrigger).toBeFocused();
    expect(await page.locator("#root").evaluate(node => (node as HTMLElement).inert)).toBe(false);
    await page.getByRole("button", { name: "Importar XLSX", exact: true }).click();
    await fitsViewport(page, dialog);
    await dialog.getByLabel("Planilha .xlsx", { exact: true }).setInputFiles({ name: "invalido.csv", mimeType: "text/csv", buffer: Buffer.from("invalid") });
    await expect(dialog.getByRole("alert")).toContainText(".xlsx");
    expect(await audit(page)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("importacao-mobile.png") });
    await page.keyboard.press("Escape");
});

test("textos longos permanecem contidos no notebook e no celular", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/fornecedor");
    const productName = "Produto".repeat(60);
    await page.evaluate(productName => {
        const product = { id: "LONGO-" + "X".repeat(120), organizationId: "fornecedor-001", name: productName, category: "Categoria".repeat(40), unit: "kg", price: 10, stock: 0, availability: "Indisponível" };
        localStorage.setItem("rotalog:supplier-products:v1:fornecedor-001", JSON.stringify([product]));
        localStorage.setItem("rotalog:supplier-orders:v1", JSON.stringify([{ id: "PED-" + "X".repeat(180), organizationId: "fornecedor-001", customer: "Comprador".repeat(80), date: "2026-10-20", total: 10, items: 1, status: "Pendente", commercialStatus: "Aguardando aceite", custodyStatus: "Aguardando separação", orderItems: [{ productId: product.id, productName, quantity: 1, unitPrice: 10 }] }]));
    }, productName);
    for (const width of [1024, 360]) {
        await page.setViewportSize({ width, height: 800 });
        for (const [name, route] of routes) {
            await page.goto(route);
            await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
            if (name === "produtos" || name === "pedidos") {
                await page.getByRole("button", { name: name === "produtos" ? `Ver detalhes de ${productName}` : /^Ver detalhes do pedido/ }).first().click();
                await fitsViewport(page, page.getByRole("dialog"));
                await page.screenshot({ path: testInfo.outputPath(`${name}-texto-longo-${width}.png`) });
                await page.keyboard.press("Escape");
            }
        }
    }
});

test("upload de imagem e importação XLSX válidos no celular", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/fornecedor/produtos");
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const bytes = await page.evaluate(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 8;
        canvas.getContext("2d")!.fillRect(0, 0, 8, 8);
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!)));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await dialog.getByLabel("Imagem do produto", { exact: true }).setInputFiles({ name: "produto.png", mimeType: "image/png", buffer: Buffer.from(bytes) });
    await expect(dialog.getByRole("img")).toBeVisible();
    await fitsViewport(page, dialog);
    await page.screenshot({ path: testInfo.outputPath("upload-mobile.png") });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Importar XLSX", exact: true }).click();
    await dialog.getByLabel("Planilha .xlsx", { exact: true }).setInputFiles("tests/fixtures/products-ui.xlsx");
    await expect(dialog.getByRole("table")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Confirmar importação (1)", exact: true })).toBeEnabled();
    await fitsViewport(page, dialog);
    const preview = dialog.getByRole("region", { name: "Rolagem da prévia de importação", exact: true });
    expect(await preview.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await audit(page)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("xlsx-mobile.png") });
    await dialog.getByRole("button", { name: "Confirmar importação (1)", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "XLSX-MOBILE", exact: true })).toBeVisible();
});
