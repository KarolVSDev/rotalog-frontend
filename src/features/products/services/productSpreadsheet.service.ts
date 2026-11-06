import { normalizeCode, validateProduct, type ProductInput } from "./supplierProducts.service";
import type { SupplierProduct } from "../mocks/products.mock";
export const productColumns = ["Código", "Nome", "Categoria", "Unidade", "Preço unitário", "Quantidade inicial"];
export type ImportRow = { line: number; product: ProductInput; errors: string[] };
const normalizeHeader = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function numberValue(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value !== "string" || !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return NaN;
    return Number(value.trim().replace(",", "."));
}
export function validateImportRows(rows: { line: number; values: unknown[] }[], existing: SupplierProduct[]): ImportRow[] {
    const products = rows.map(({ line, values }) => ({ line, product: { id: String(values[0] ?? "").trim(), name: String(values[1] ?? "").trim(), category: String(values[2] ?? "").trim(), unit: String(values[3] ?? "").trim(), price: numberValue(values[4]), stock: numberValue(values[5]) }, errors: [] as string[] }));
    const codes = new Map<string, number>();
    products.forEach(({ product }) => codes.set(normalizeCode(product.id), (codes.get(normalizeCode(product.id)) ?? 0) + 1));
    return products.map((row) => {
        const errors = validateProduct(row.product);
        if (codes.get(normalizeCode(row.product.id))! > 1) errors.push("Código duplicado na planilha.");
        if (existing.some((product) => normalizeCode(product.id) === normalizeCode(row.product.id))) errors.push("Código já cadastrado neste fornecedor.");
        return { ...row, errors };
    });
}
export async function readProductSpreadsheet(file: File, existing: SupplierProduct[]): Promise<ImportRow[]> {
    if (!/\.xlsx$/i.test(file.name)) throw new Error("Selecione um arquivo .xlsx.");
    if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 5 MB.");
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(await file.arrayBuffer()); } catch { throw new Error("Não foi possível ler a planilha XLSX. Verifique se o arquivo está íntegro e sem senha."); }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) throw new Error("A primeira aba deve conter cabeçalho e produtos.");
    if (sheet.rowCount > 5001) throw new Error("Importe no máximo 5.000 linhas por arquivo.");
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => { headers[index - 1] = normalizeHeader(cell.value); });
    const indexes = productColumns.map((title) => {
        const matches = headers.flatMap((value, index) => value === normalizeHeader(title) ? [index + 1] : []);
        if (matches.length !== 1) throw new Error(`Coluna obrigatória ausente ou repetida: ${title}. Baixe o modelo.`);
        return matches[0];
    });
    const raw: { line: number; values: unknown[] }[] = [];
    const invalidCells = new Set<number>();
    sheet.eachRow((row, line) => {
        if (line === 1) return;
        const values = indexes.map((index) => {
            const value = row.getCell(index).value;
            if (value !== null && typeof value !== "string" && typeof value !== "number") { invalidCells.add(line); return ""; }
            return value;
        });
        if (values.some((value) => value !== null && String(value).trim()) || invalidCells.has(line)) raw.push({ line, values });
    });
    if (!raw.length) throw new Error("A planilha não contém produtos.");
    return validateImportRows(raw, existing).map((row) => invalidCells.has(row.line) ? { ...row, errors: [...row.errors, "Utilize apenas texto e números, sem fórmulas ou células especiais."] } : row);
}
export async function downloadProductTemplate() {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Produtos");
    sheet.addRow(productColumns);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 24; });
    sheet.addRow(["EXEMPLO-001", "Produto de exemplo", "Categoria", "Unidade", 10.5, 0]);
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a"); link.href = url; link.download = "modelo-produtos-rotalog.xlsx"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
