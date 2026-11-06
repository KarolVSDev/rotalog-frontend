import type { SupplierProduct } from "../mocks/products.mock";
import { createSupplierProducts, editSupplierProduct, getSupplierProducts, type ProductInput } from "./supplierProducts.service";
import { productImageStorage, type ProductImageStorage } from "./productImages.service";

type SaveOptions = {
    organizationId: string;
    product?: SupplierProduct;
    input: ProductInput;
    // undefined: preservar; null: remover; Blob: substituir.
    image: Blob | null | undefined;
};

export async function saveProductWithImage({ organizationId, product, input, image }: SaveOptions, storage: ProductImageStorage = productImageStorage): Promise<{ warning: string | null }> {
    if (product && product.organizationId !== organizationId) throw new Error("Produto de outra organização.");
    let newReference: string | undefined;
    try {
        // Primeiro confirma a gravação do arquivo; só então publica a referência.
        if (image) newReference = await storage.put(organizationId, image);
        const current = product ? getSupplierProducts(organizationId).find(item => item.id === product.id) : undefined;
        if (product && (!current || current.imageRef !== product.imageRef)) throw new Error("A imagem deste produto foi atualizada em outra operação. Reabra a edição.");
        const changes = { ...input, imageRef: image === undefined ? current?.imageRef : newReference };
        if (product) editSupplierProduct(organizationId, product.id, changes);
        else createSupplierProducts(organizationId, [changes]);
    } catch (error) {
        if (newReference) {
            try { await storage.remove(organizationId, newReference); }
            catch { throw new Error("O produto não foi salvo. A imagem temporária não pôde ser removida; verifique o armazenamento do navegador."); }
        }
        throw error;
    }
    if (image !== undefined && product?.imageRef) {
        try {
            // Nunca remove um arquivo ainda referenciado no catálogo.
            if (!getSupplierProducts(organizationId).some(item => item.imageRef === product.imageRef)) await storage.remove(organizationId, product.imageRef);
        } catch { return { warning: "Produto salvo. Não foi possível limpar a imagem anterior do armazenamento do navegador." }; }
    }
    return { warning: null };
}
