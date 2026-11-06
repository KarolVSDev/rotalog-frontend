import { expect, test } from "@playwright/test";

test("ExcelJS downloads only on request and preserves template and import", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("rotalog:mock-auth-user", JSON.stringify({ id: "u2", name: "Operador", email: "supplier@example.invalid", role: "SUPPLIER_OPERATOR" })));
    const requests: string[] = [];
    page.on("request", request => requests.push(request.url()));
    await page.goto("/fornecedor/produtos");
    await page.getByRole("button", { name: "Importar XLSX", exact: true }).click();
    expect(requests.some(url => /exceljs/i.test(url))).toBe(false);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar modelo XLSX" }).click();
    expect((await download).suggestedFilename()).toBe("modelo-produtos-rotalog.xlsx");
    expect(requests.some(url => /exceljs/i.test(url))).toBe(true);
    await page.getByLabel("Planilha .xlsx", { exact: true }).setInputFiles("tests/fixtures/products-ui.xlsx");
    await expect(page.getByRole("dialog").getByRole("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar importação (1)", exact: true })).toBeEnabled();
});
