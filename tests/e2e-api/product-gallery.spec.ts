import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const imageId = "33333333-3333-4333-8333-333333333333";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64");
async function setup(page: Page) {
    const state = { version: 1, images: [] as Record<string, unknown>[], creates: 0, intents: 0, failUpload: false, rejected: false, pending: false, conflict: false, full: false, role: "ROTALOG_ADMIN", writes: [] as { path: string; key?: string; body?: unknown }[] };
    const gallery = () => ({ product_id: id, product_version: state.version, images: state.images, primary_image_id: state.images.find(image => image.is_primary)?.id ?? null, is_synthetic: true });
    const product = () => ({ id, name: "Produto da galeria", brand: "Marca teste", category: "ALIMENTO_SECO_INDUSTRIALIZADO", gtin: null, net_content: 1000, net_content_unit: "g", packaging_type: "Pacote", packaging_quantity: 1, gross_weight_grams: 1050, volume_cm3: 1500, variant_attributes: {}, publication_state: "PUBLISHED", version: state.version, demo_run_id: "demo", is_synthetic: true, images: state.images, primary_image: state.images.find(image => image.is_primary) ?? null });
    const metadata = (image = imageId, file = fileId) => ({ id: image, file_id: file, position: 0, is_primary: true, alt_text: "Imagem de teste", mime_type: "image/png", size_bytes: png.length, sha256: "a".repeat(64), width: 1, height: 1, content_url: `/api/v1/products/${id}/images/${image}/content`, requires_authentication: true });
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", async route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        const user = { id: "admin", name: "Admin teste", email: "admin@example.invalid", role: state.role, organization_id: "org", organizations: [{ id: "org", name: "Organização teste", role: state.role }], capabilities: state.role === "ROTALOG_ADMIN" ? ["catalog:read", "product:write"] : ["catalog:read", "offer:write", "supplier_order:manage"], demo_run_id: "demo", is_synthetic: true };
        if (path === "/api/v1/auth/refresh") return route.fulfill({ json: { access_token: "access", expires_in: 600, csrf_token: "csrf", user } });
        if (path === "/api/v1/me") return route.fulfill({ json: user });
        if (request.method() !== "GET") state.writes.push({ path, key: request.headers()["idempotency-key"], body: request.headers()["content-type"] === "application/json" && request.postData() ? request.postDataJSON() : undefined });
        if (path === "/api/v1/admin/products") { state.creates++; return route.fulfill({ status: 201, json: { ...product(), publication_state: "DRAFT" } }); }
        if (path.endsWith("/publish")) { state.version++; return route.fulfill({ json: product() }); }
        if (path === "/api/v1/products") return route.fulfill({ json: { items: [product()], total: 1, page: 1, page_size: 25, is_synthetic: true } });
        if (path === `/api/v1/products/${id}`) return route.fulfill({ json: product() });
        if (path === `/api/v1/products/${id}/images`) return route.fulfill({ json: gallery() });
        if (path.endsWith("/content") && request.method() === "GET") return route.fulfill({ contentType: "image/png", body: png });
        const status = () => ({ file_id: fileId, product_id: id, status: state.rejected ? "REJECTED" : state.pending ? "SCANNING" : "AVAILABLE", rejection_reason: state.rejected ? "Image rejetée par le traitement" : null });
        if (path === "/api/v1/files/upload-intents") { state.intents++; return route.fulfill({ status: 201, json: { ...status(), status: "PENDING_UPLOAD", upload_url: `/api/v1/files/${fileId}/content`, method: "PUT", headers: { "Content-Type": "application/octet-stream" }, max_bytes: 8388608, max_pixels: 16000000 } }); }
        if (path === `/api/v1/files/${fileId}/content`) {
            expect(request.headers()["content-type"]).toBe("application/octet-stream");
            if (state.failUpload) { state.failUpload = false; return route.abort(); }
            return route.fulfill({ status: 204 });
        }
        if (path === `/api/v1/files/${fileId}/confirm-upload`) return route.fulfill({ status: 202, json: { ...status(), status: "QUARANTINED" } });
        if (path === `/api/v1/files/${fileId}`) return route.fulfill({ json: status() });
        if (path.startsWith(`/api/v1/admin/products/${id}/images`)) {
            if (state.full) return route.fulfill({ status: 409, json: { error: { code: "PRODUCT_IMAGE_LIMIT" } } });
            if (state.conflict) { state.conflict = false; state.version++; return route.fulfill({ status: 409, json: { error: { code: "VERSION_CONFLICT" } } }); }
            const body = request.postDataJSON(); expect(body.expected_version).toBe(state.version);
            if (path.endsWith("/reorder")) state.images = body.image_ids.map((image: string, position: number) => ({ ...state.images.find(item => item.id === image)!, position }));
            else if (path.endsWith("/set-primary")) { const target = path.split("/").at(-2); state.images = state.images.map(image => ({ ...image, is_primary: image.id === target })); }
            else if (request.method() === "DELETE") { const target = path.split("/").at(-1); state.images = state.images.filter(image => image.id !== target).map((image, position) => ({ ...image, position, is_primary: position === 0 })); }
            else state.images.push(metadata());
            state.version++; return route.fulfill({ status: path.endsWith("/images") && request.method() === "POST" ? 201 : 200, json: gallery() });
        }
        if (["/api/v1/supplier-orders", "/api/v1/offers", "/api/v1/warehouses"].includes(path)) return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 25 } });
        throw new Error(`Unexpected endpoint ${path}`);
    });
    return { state, metadata };
}
async function file(page: Page, type = "image/png") {
    const base64 = await page.evaluate(mime => { const canvas = document.createElement("canvas"); canvas.width = 4; canvas.height = 4; return canvas.toDataURL(mime).split(",")[1]; }, type);
    return { name: type === "image/png" ? "teste.png" : "teste.jpg", mimeType: type, buffer: Buffer.from(base64, "base64") };
}
async function openGallery(page: Page) { await page.goto("/admin/products"); await page.getByRole("button", { name: "Ver detalhes", exact: true }).click(); await expect(page.getByRole("heading", { name: "Galeria do produto" })).toBeVisible(); }
test("selection preview, removal and invalid files", async ({ page }) => {
    await setup(page); await openGallery(page);
    const input = page.getByLabel("Selecionar imagens", { exact: true });
    await input.setInputFiles({ name: "bad.webp", mimeType: "image/webp", buffer: Buffer.from("bad") });
    await expect(page.getByRole("alert")).toContainText("PNG ou JPEG");
    await input.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(8388609) });
    await expect(page.getByRole("alert")).toContainText("8 MiB");
    await input.setInputFiles(await file(page));
    await expect(page.getByAltText("Prévia de teste.png")).toBeVisible();
    await page.getByRole("button", { name: "Remover seleção teste.png" }).click();
    await expect(page.getByAltText("Prévia de teste.png")).toHaveCount(0);
});
for (const type of ["image/png", "image/jpeg"]) test(`uploads ${type} through AVAILABLE and attachment`, async ({ page }) => {
    const { state } = await setup(page); await openGallery(page);
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page, type));
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).click();
    await expect(page.getByText("1 imagem(ns)", { exact: false })).toBeVisible();
    expect(state.intents).toBe(1); expect(state.images).toHaveLength(1);
    expect(state.writes.filter(write => write.path.includes("/files/")).every(write => !!write.key)).toBe(true);
});
test("partial creation preserves product and resumes same upload without duplicate intent", async ({ page }) => {
    const { state } = await setup(page); state.failUpload = true;
    await page.goto("/admin/products/new"); await page.getByRole("button", { name: "Iniciar cadastro individual" }).click();
    for (const [label, value] of [["Nome do produto", "Produto teste"], ["Marca", "Marca teste"], ["Conteúdo líquido", "1000"], ["Tipo de embalagem", "Pacote"], ["Quantidade por embalagem", "1"], ["Peso bruto (gramas)", "1050"], ["Volume (cm³)", "1500"]]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page));
    await page.getByRole("button", { name: "Cadastrar como rascunho" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Produto salvo. O envio" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).click();
    await expect(page.getByText("1 imagem(ns)", { exact: false })).toBeVisible();
    expect(state.creates).toBe(1); expect(state.intents).toBe(1);
    const puts = state.writes.filter(write => write.path.endsWith("/content")); expect(puts).toHaveLength(2); expect(puts[0].key).toBe(puts[1].key);
});
test("rejection and gallery limit remain explicit", async ({ page }) => {
    const { state } = await setup(page); state.rejected = true; await openGallery(page);
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page));
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).click();
    await expect(page.getByRole("alert")).toContainText("rejetée"); expect(state.images).toHaveLength(0);
    await page.getByRole("button", { name: "Remover seleção teste.png" }).click();
    state.rejected = false; state.full = true;
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page));
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).click();
    await expect(page.getByRole("alert")).toContainText("Galeria cheia"); expect(state.images).toHaveLength(0);
});
test("principal, reorder, conflict and confirmed logical removal", async ({ page }) => {
    const { state, metadata } = await setup(page); state.images = [metadata(), { ...metadata("44444444-4444-4444-8444-444444444444", "other-file"), position: 1, is_primary: false }];
    await openGallery(page);
    await page.getByRole("button", { name: "Definir principal", exact: true }).nth(1).click();
    await expect.poll(() => state.images[1].is_primary).toBe(true);
    await page.getByRole("button", { name: "Mover imagem 2 para cima" }).click();
    await expect.poll(() => state.images[0].id).toBe("44444444-4444-4444-8444-444444444444");
    state.conflict = true;
    await page.getByRole("button", { name: "Remover imagem 1", exact: true }).click();
    await expect(page.getByText("Confirma remover esta associação?", { exact: false })).toBeVisible();
    expect(state.images).toHaveLength(2);
    await page.getByRole("button", { name: "Confirmar remoção" }).click();
    await expect(page.getByRole("alert")).toContainText("Conflito");
    await page.getByRole("button", { name: "Confirmar remoção" }).click();
    await expect.poll(() => state.images.length).toBe(1);
    expect(state.writes.some(write => write.path.includes("/files/") && write.path.includes("delete"))).toBe(false);
});
test("supplier does not receive administrative gallery actions", async ({ page }) => {
    const { state } = await setup(page); state.role = "SUPPLIER_OPERATOR";
    await page.goto("/fornecedor/produtos#catalogo"); await page.getByRole("button", { name: "Ver detalhes de Produto da galeria" }).click();
    await expect(page.getByRole("heading", { name: "Detalhes do produto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Galeria do produto" })).toHaveCount(0); expect(state.writes).toHaveLength(0);
});

test("pending processing resumes without uploading or confirming again", async ({ page }) => {
    const { state } = await setup(page); state.pending = true; await openGallery(page);
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page));
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).click();
    await expect(page.getByRole("alert")).toContainText("Processamento ainda pendente", { timeout: 20000 });
    expect(state.images).toHaveLength(0);
    state.pending = false;
    await page.getByRole("button", { name: "Enviar ou retomar imagens selecionadas" }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => state.images.length).toBe(1);
    expect(state.intents).toBe(1);
    expect(state.writes.filter(write => write.path.endsWith("/content"))).toHaveLength(1);
    expect(state.writes.filter(write => write.path.endsWith("/confirm-upload"))).toHaveLength(1);
});
for (const width of [320, 390, 768, 1440]) test(`gallery accessible at ${width}px`, async ({ page }, testInfo) => {
    await setup(page); await page.setViewportSize({ width, height: 900 }); await openGallery(page);
    await page.getByLabel("Selecionar imagens", { exact: true }).setInputFiles(await file(page));
    await expect(page.getByAltText("Prévia de teste.png")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByAltText("Prévia de teste.png").scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`gallery-${width}.png`), fullPage: true });
});
