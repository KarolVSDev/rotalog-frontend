import { productsMock, type SupplierProduct } from "../mocks/products.mock";

import { createInitialStockMovement } from "../../inventory/services/stockMovements";

export type ProductInput = Pick<SupplierProduct, "id" | "name" | "category" | "unit" | "price" | "stock" | "imageRef">;
const PREFIX = "rotalog:supplier-products:v1:";
const EVENT = "rotalog:supplier-products-changed";
export const normalizeCode = (code: string) => code.trim().toLocaleUpperCase("pt-BR");

export function validateProduct(input: ProductInput): string[] {
    const errors: string[] = [];
    if (![input.id, input.name, input.category, input.unit].every((value) => typeof value === "string" && value.trim())) errors.push("Código, nome, categoria e unidade são obrigatórios.");
    if (!Number.isFinite(input.price) || input.price <= 0) errors.push("Preço deve ser maior que zero.");
    if (!Number.isFinite(input.stock) || input.stock < 0) errors.push("Estoque deve ser não negativo.");
    if (input.imageRef !== undefined && (typeof input.imageRef !== "string" || !/^product-image:[a-f0-9]{32}$/.test(input.imageRef))) errors.push("Referência de imagem inválida.");
    return errors;
}

export function getSupplierProducts(organizationId: string): SupplierProduct[] {
    const defaults = productsMock.filter((product) => product.organizationId === organizationId).map((product) => ({ ...product }));
    const stored = localStorage.getItem(PREFIX + organizationId);
    if (!stored) return defaults;
    let parsed: unknown;
    try { parsed = JSON.parse(stored); } catch { throw new Error("Catálogo salvo inválido. Nenhum dado foi sobrescrito."); }
    if (!Array.isArray(parsed) || !parsed.every((value: unknown) => {
        if (typeof value !== "object" || !value) return false;
        const product = value as SupplierProduct;
        return product.organizationId === organizationId && validateProduct(product).length === 0 && ["Disponível", "Estoque baixo", "Indisponível"].includes(product.availability);
    })) throw new Error("Catálogo salvo inválido. Nenhum dado foi sobrescrito.");
    const products = parsed as SupplierProduct[];
    if (new Set(products.map((product) => normalizeCode(product.id))).size !== products.length) throw new Error("Códigos duplicados no catálogo salvo.");
    return [...defaults.filter((product) => !products.some((saved) => normalizeCode(saved.id) === normalizeCode(product.id))), ...products];
}

function save(organizationId: string, products: SupplierProduct[]) {
    localStorage.setItem(PREFIX + organizationId, JSON.stringify(products));
    window.dispatchEvent(new Event(EVENT));
}

export function createSupplierProducts(organizationId: string, inputs: ProductInput[], source: "product-create" | "xlsx-import" = "product-create"): SupplierProduct[] {
    if (!organizationId || inputs.length === 0) throw new Error("Organização e produtos são obrigatórios.");
    const current = getSupplierProducts(organizationId);
    const codes = new Set(current.map((product) => normalizeCode(product.id)));
    const additions = inputs.map((input): SupplierProduct => {
        const errors = validateProduct(input);
        if (errors.length) throw new Error(errors.join(" "));
        const code = normalizeCode(input.id);
        if (codes.has(code)) throw new Error(`Código já cadastrado ou duplicado: ${input.id}.`);
        codes.add(code);
        const product: SupplierProduct = { ...input, id: input.id.trim(), name: input.name.trim(), category: input.category.trim(), unit: input.unit.trim(), organizationId, availability: input.stock === 0 ? "Indisponível" : input.stock <= 10 ? "Estoque baixo" : "Disponível" };
        // Saldo inicial e evento compartilham a mesma gravação do catálogo.
        if (product.stock > 0) product.stockMovements = [createInitialStockMovement(product, source)];
        return product;
    });
    const updated = [...current, ...additions];
    save(organizationId, updated);
    return updated;
}

export function editSupplierProduct(organizationId: string, id: string, changes: Pick<ProductInput, "name" | "category" | "unit" | "price" | "imageRef">): SupplierProduct[] {
    const current = getSupplierProducts(organizationId);
    const product = current.find((item) => item.id === id);
    if (!product) throw new Error("Produto não encontrado para esta organização.");
    const updatedProduct = { ...product, name: changes.name, category: changes.category, unit: changes.unit, price: changes.price, ...("imageRef" in changes ? { imageRef: changes.imageRef } : {}) };
    const errors = validateProduct(updatedProduct);
    if (errors.length) throw new Error(errors.join(" "));
    updatedProduct.name = updatedProduct.name.trim();
    updatedProduct.category = updatedProduct.category.trim();
    updatedProduct.unit = updatedProduct.unit.trim();
    const updated = current.map((item) => item.id === id ? updatedProduct : item);
    save(organizationId, updated);
    return updated;
}

export function subscribeSupplierProducts(refresh: () => void) {
    const storage = (event: StorageEvent) => { if (event.storageArea === localStorage && (event.key === null || event.key.startsWith(PREFIX))) refresh(); };
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener("storage", storage); };
}
