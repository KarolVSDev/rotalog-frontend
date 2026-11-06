import { expect, test } from "@playwright/test";

test("unknown page retains 404 presentation and application identity", async ({ page }) => {
    await page.route("http://localhost:8000/**", route => route.fulfill({ status: 401 }));
    await page.goto("/pagina-inexistente");
    await expect(page).toHaveTitle("RotaLog");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Não foi possível carregar esta página" })).toHaveCount(0);
});

test("unexpected rendering failure has safe recovery instead of 404", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("rotalog:api-csrf", "csrf"));
    await page.route("http://localhost:8000/**", route => {
        const path = new URL(route.request().url()).pathname;
        const user = { id: "admin", name: "Admin teste", email: "admin@example.invalid", role: "ROTALOG_ADMIN", organization_id: "org", organizations: [{ id: "org", name: "Organização", role: "ROTALOG_ADMIN" }], capabilities: ["catalog:read", "product:write"], demo_run_id: "demo", is_synthetic: true };
        if (path.endsWith("/auth/refresh")) return route.fulfill({ json: { access_token: "test", expires_in: 600, csrf_token: "csrf", user } });
        if (path.endsWith("/me")) return route.fulfill({ json: user });
        // Deliberately malformed API data exercises the actual route error boundary.
        if (path === "/api/v1/products") return route.fulfill({ json: { items: [null], total: 1, page: 1, page_size: 25 } });
        return route.fulfill({ status: 404 });
    });
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Não foi possível carregar esta página" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("alert")).not.toContainText(/TypeError|stack|Cannot read/);
});
