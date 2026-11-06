import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const productId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";
const content = `/api/v1/products/${productId}/images/${imageId}/content`;
const image = { id: imageId, file_id: "file", position: 0, is_primary: true, alt_text: "Embalagem canônica de teste", mime_type: "image/png", size_bytes: 68, sha256: "hash", width: 1, height: 1, content_url: content, requires_authentication: true };
const product = { id: productId, name: "Produto com imagem", brand: "Marca teste", category: "ALIMENTO_SECO_INDUSTRIALIZADO", gtin: null, net_content: 1000, net_content_unit: "g", packaging_type: "Pacote", packaging_quantity: 1, gross_weight_grams: 1050, volume_cm3: 1500, variant_attributes: {}, publication_state: "PUBLISHED", version: 1, demo_run_id: "demo", is_synthetic: true, images: [image], primary_image: image };
type Role = "BUYER_ADMIN" | "SUPPLIER_OPERATOR" | "ROTALOG_ADMIN";
async function setup(page: Page, role: Role = "ROTALOG_ADMIN") {
    const state = { imageStatus: 200, badUrl: false, expire: false, organization: "org-a", downloads: [] as string[] };
    await page.addInitScript(() => {
        sessionStorage.setItem("rotalog:api-csrf", "csrf");
        const original = URL.revokeObjectURL.bind(URL);
        const revoked: string[] = [];
        Object.defineProperty(window, "imageRevocations", { value: revoked });
        URL.revokeObjectURL = url => { revoked.push(url); original(url); };
    });
    await page.route("http://localhost:8000/**", async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname;
        const capabilities = role === "BUYER_ADMIN" ? ["catalog:read", "purchase:read", "checkout:create"] : role === "ROTALOG_ADMIN" ? ["catalog:read", "product:write"] : ["supplier_order:manage", "offer:write", "inventory:write"];
        const user = { id: "user", name: "Usuário teste", email: "test@example.invalid", role, organization_id: state.organization, organizations: ["org-a", "org-b"].map(id => ({ id, name: id, role })), capabilities, demo_run_id: "demo", is_synthetic: true };
        if (path === "/api/v1/auth/refresh") return state.expire ? route.fulfill({ status: 401 }) : route.fulfill({ json: { access_token: "access", expires_in: 600, csrf_token: "csrf", user } });
        if (path === "/api/v1/me") return route.fulfill({ json: user });
        if (path === "/api/v1/auth/logout") return route.fulfill({ status: 204 });
        expect(request.method()).toBe("GET");
        if (path === content) {
            expect(request.headers().authorization).toBe("Bearer access");
            state.downloads.push(request.headers()["x-organization-id"]);
            if (state.imageStatus !== 200) return route.fulfill({ status: state.imageStatus });
            return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64") });
        }
        const actual = state.badUrl ? { ...product, primary_image: { ...image, content_url: "https://evil.invalid/image" }, images: [] } : product;
        if (path === `/api/v1/products/${productId}`) return route.fulfill({ json: actual });
        if (path === `/api/v1/products/${productId}/images`) return route.fulfill({ json: { product_id: productId, product_version: 1, images: [], primary_image_id: null, is_synthetic: true } });
        const pageNumber = Number(url.searchParams.get("page") || 1), pageSize = Number(url.searchParams.get("page_size") || 25);
        if (path === "/api/v1/products") return route.fulfill({ json: { items: [actual, { ...product, id: "no-image", name: "Produto sem imagem", images: [], primary_image: null }], total: 2, page: pageNumber, page_size: pageSize, is_synthetic: true } });
        if (["/api/v1/supplier-orders", "/api/v1/offers", "/api/v1/warehouses", "/api/v1/inventory", "/api/v1/suppliers"].includes(path)) return route.fulfill({ json: { items: [], total: 0, page: pageNumber, page_size: pageSize } });
        throw new Error(`Unexpected endpoint ${path}`);
    });
    return state;
}
for (const role of ["BUYER_ADMIN", "SUPPLIER_OPERATOR", "ROTALOG_ADMIN"] as const) test(`${role} displays authenticated main image and keeps placeholder`, async ({ page }) => {
    const state = await setup(page, role);
    await page.goto(role === "BUYER_ADMIN" ? "/" : role === "SUPPLIER_OPERATOR" ? "/fornecedor/produtos#catalogo" : "/admin/products");
    const img = page.getByAltText(image.alt_text);
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", /^blob:/);
    expect(await img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(page.getByRole("img", { name: "Imagem de Produto sem imagem não disponível" })).toBeVisible();
    expect(state.downloads.every(org => org === "org-a")).toBe(true);
    if (role !== "BUYER_ADMIN") {
        await page.getByRole("button", { name: role === "ROTALOG_ADMIN" ? "Ver detalhes" : "Ver detalhes de Produto com imagem", exact: true }).first().click();
        await expect(page.getByRole("dialog").getByAltText(image.alt_text)).toBeVisible();
    } else {
        await page.goto(`/produto/${productId}`);
        await expect(page.getByAltText(image.alt_text)).toBeVisible();
    }
});
test("failed downloads and untrusted paths preserve fallback without leaking credentials", async ({ page }) => {
    const state = await setup(page); state.imageStatus = 404;
    let external = 0; page.on("request", request => { if (request.url().includes("evil.invalid")) external++; });
    await page.goto("/admin/products");
    await expect(page.getByRole("img", { name: "Imagem de Produto com imagem não disponível" })).toBeVisible();
    await expect.poll(() => state.downloads.length).toBeGreaterThan(0);
    const count = state.downloads.length; state.badUrl = true;
    await page.reload();
    await expect(page.getByRole("img", { name: "Imagem de Produto com imagem não disponível" })).toBeVisible();
    expect(state.downloads.length).toBe(count); expect(external).toBe(0);
});
test("image 401 expires the shared session", async ({ page }) => {
    const state = await setup(page);
    await page.goto("/admin/products"); await expect(page.getByAltText(image.alt_text)).toBeVisible();
    state.imageStatus = 401; state.expire = true;
    await page.getByRole("button", { name: "Ver detalhes", exact: true }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByAltText(image.alt_text)).toHaveCount(0);
});
test("organization switch and logout revoke object URLs", async ({ page }) => {
    const state = await setup(page);
    await page.goto("/admin/products"); await expect(page.getByAltText(image.alt_text)).toBeVisible();
    const previous = await page.getByAltText(image.alt_text).getAttribute("src");
    state.organization = "org-b";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => state.downloads.includes("org-b")).toBe(true);
    await expect.poll(() => page.evaluate(url => (window as unknown as { imageRevocations: string[] }).imageRevocations.includes(url!), previous)).toBe(true);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByAltText(image.alt_text)).toHaveCount(0);
});
for (const width of [320, 390, 768, 1440]) test(`images responsive and accessible ${width}px`, async ({ page }, testInfo) => {
    await setup(page); await page.setViewportSize({ width, height: 900 }); await page.goto("/admin/products");
    await expect(page.getByAltText(image.alt_text)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`product-image-${width}.png`), fullPage: true });
});
