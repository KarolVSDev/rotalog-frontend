import { test, expect, type Page } from "@playwright/test";

const catalogKey = "rotalog:supplier-products:v1:fornecedor-001";
test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "test", name: "Teste", email: "teste@rotalog.test", role: "SUPPLIER_OPERATOR" })));
});

async function imageFile(page: Page, type = "image/png") {
    const bytes = await page.evaluate(async type => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 8;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#194567";
        context.fillRect(0, 0, 8, 8);
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), type));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, type);
    return { name: `produto.${type.split("/")[1]}`, mimeType: type, buffer: Buffer.from(bytes) };
}

async function storedImageKeys(page: Page) {
    return page.evaluate(() => new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = indexedDB.open("rotalog:supplier-product-images", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("images");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction("images");
            const keys = transaction.objectStore("images").getAllKeys();
            transaction.oncomplete = () => { database.close(); resolve(keys.result); };
        };
    }));
}

for (const width of [1440, 390]) {
    test(`modal centralizado na viewport ${width}px e fechamento acessível`, async ({ page }) => {
        const height = width === 390 ? 640 : 844;
        await page.setViewportSize({ width, height });
        await page.goto("/fornecedor/produtos");
        const trigger = page.getByRole("button", { name: "Novo produto", exact: true });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Novo produto", exact: true });
        const box = (await dialog.boundingBox())!;
        expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
        expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThan(2);
        expect(box.width).toBeLessThanOrEqual(768);
        expect(box.width).toBeLessThan(width);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        if (width === 390) expect(await dialog.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
        await page.screenshot({ path: `test-results/product-form-${width}.png` });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await trigger.click();
        await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await trigger.click();
        await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
        await expect(trigger).toBeFocused();
    });
}

test("validação, preview, cadastro, persistência, detalhes, substituição e remoção", async ({ page }) => {
    await page.goto("/fornecedor/produtos");
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const upload = dialog.getByLabel("Imagem do produto", { exact: true });
    await upload.setInputFiles({ name: "arquivo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(dialog.getByRole("alert")).toContainText("JPG, PNG ou WebP");
    await upload.setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    await expect(dialog.getByRole("alert")).toContainText("2 MB");
    await upload.setInputFiles({ name: "corrompida.png", mimeType: "image/png", buffer: Buffer.from("invalid") });
    await expect(dialog.getByRole("alert")).toContainText("Não foi possível ler");
    const png = await imageFile(page);
    await upload.setInputFiles(png);
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog.getByRole("button", { name: "Remover imagem" }).click();
    await expect(dialog.getByRole("img")).toHaveCount(0);
    await upload.setInputFiles(png);
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog.getByLabel("Código do produto", { exact: true }).fill("COM-IMAGEM");
    await dialog.getByLabel("Nome", { exact: true }).fill("Produto com imagem");
    await dialog.getByLabel("Categoria", { exact: true }).fill("Categoria teste");
    await dialog.getByLabel("Unidade de medida", { exact: true }).fill("kg");
    await dialog.getByLabel("Preço unitário (R$)", { exact: true }).fill("12.50");
    await dialog.getByLabel("Quantidade inicial em estoque", { exact: true }).fill("7");
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "COM-IMAGEM", exact: true }) });
    await expect(row.getByRole("img")).toBeVisible();
    expect(await storedImageKeys(page)).toHaveLength(1);
    const saved = await page.evaluate(key => localStorage.getItem(key)!, catalogKey);
    expect(saved).not.toContain("base64");
    expect(saved).not.toContain("blob:");
    const product = JSON.parse(saved).find((item: { id: string }) => item.id === "COM-IMAGEM");
    await page.reload();
    await expect(row.getByRole("img")).toBeVisible();
    await row.getByRole("button", { name: "Ver detalhes de Produto com imagem", exact: true }).click();
    await expect(dialog.getByRole("img")).toBeVisible();
    await page.keyboard.press("Escape");
    await row.getByRole("button", { name: "Editar produto Produto com imagem", exact: true }).click();
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await storedImageKeys(page)).toEqual([["fornecedor-001", product.imageRef]]);
    await row.getByRole("button", { name: "Editar produto Produto com imagem", exact: true }).click();
    await upload.setInputFiles(await imageFile(page, "image/webp"));
    await expect(dialog.getByRole("button", { name: "Salvar produto", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const replacedKeys = await storedImageKeys(page);
    expect(replacedKeys).toHaveLength(1);
    expect(replacedKeys).not.toEqual([["fornecedor-001", product.imageRef]]);
    await row.getByRole("button", { name: "Editar produto Produto com imagem", exact: true }).click();
    await dialog.getByRole("button", { name: "Remover imagem", exact: true }).click();
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await storedImageKeys(page)).toHaveLength(0);
    await page.reload();
    await expect(row.getByRole("img")).toHaveCount(0);
    const removed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === "COM-IMAGEM"), catalogKey);
    const { imageRef: _reference, ...withoutImage } = product;
    expect(removed).toEqual(withoutImage);
});

test("edição de produto existente, falha de gravação e isolamento das imagens", async ({ page }) => {
    await page.goto("/fornecedor/produtos");
    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "PROD-001", exact: true }) });
    await row.getByRole("button", { name: /^Editar produto/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Imagem do produto", { exact: true }).setInputFiles(await imageFile(page, "image/jpeg"));
    await expect(dialog.getByRole("img")).toBeVisible();
    await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (key.startsWith("rotalog:supplier-products:")) throw new DOMException("Sem espaço para salvar produto", "QuotaExceededError");
            original.call(this, key, value);
        };
    });
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Sem espaço");
    expect(await storedImageKeys(page)).toHaveLength(0);
    expect(await page.evaluate(key => localStorage.getItem(key), catalogKey)).toBeNull();
    await page.reload();
    await row.getByRole("button", { name: /^Editar produto/ }).click();
    await dialog.getByLabel("Imagem do produto", { exact: true }).setInputFiles(await imageFile(page));
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row.getByRole("img")).toBeVisible();
    await page.evaluate(key => {
        const product = JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === "PROD-001");
        localStorage.setItem("rotalog:supplier-products:v1:fornecedor-002", JSON.stringify([{ ...product, organizationId: "fornecedor-002", name: "Outro fornecedor" }]));
    }, catalogKey);
    await page.getByText("Controles de desenvolvimento", { exact: true }).click();
    await page.getByLabel("Organização ativa", { exact: true }).selectOption("fornecedor-002");
    const foreign = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "PROD-001", exact: true }) });
    await expect(foreign).toContainText("Imagem indisponível neste navegador");
    await expect(foreign.getByRole("img")).toHaveCount(0);
    expect(await storedImageKeys(page)).toHaveLength(1);
});

test("imagem opcional e cancelamento de preview não alteram produtos nem gravam arquivos", async ({ page }) => {
    await page.goto("/fornecedor/produtos");
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Imagem do produto", { exact: true }).setInputFiles(await imageFile(page));
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect(await storedImageKeys(page)).toHaveLength(0);
    expect(await page.evaluate(key => localStorage.getItem(key), catalogKey)).toBeNull();
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    await dialog.getByLabel("Código do produto", { exact: true }).fill("SEM-IMAGEM");
    await dialog.getByLabel("Nome", { exact: true }).fill("Produto sem imagem");
    await dialog.getByLabel("Categoria", { exact: true }).fill("Categoria teste");
    await dialog.getByLabel("Unidade de medida", { exact: true }).fill("kg");
    await dialog.getByLabel("Preço unitário (R$)", { exact: true }).fill("1");
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "SEM-IMAGEM", exact: true }) });
    await expect(row).toContainText("Sem imagem");
    await row.getByRole("button", { name: "Editar produto Produto sem imagem", exact: true }).click();
    await dialog.getByLabel("Nome", { exact: true }).fill("Nome atualizado");
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(row).toContainText("Nome atualizado");
    expect(await storedImageKeys(page)).toHaveLength(0);
});
