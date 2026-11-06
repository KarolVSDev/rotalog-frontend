const MAX_SIZE = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateProductImage(file: Blob): void {
    if (!TYPES.includes(file.type)) throw new Error("Selecione uma imagem JPG, PNG ou WebP.");
    if (file.size === 0 || file.size > MAX_SIZE) throw new Error("A imagem deve ter conteúdo e no máximo 2 MB.");
}

export interface ProductImageStorage {
    put(organizationId: string, file: Blob): Promise<string>;
    get(organizationId: string, reference: string): Promise<Blob | undefined>;
    remove(organizationId: string, reference: string): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") return reject(new Error("Armazenamento de imagens indisponível neste navegador."));
        const request = indexedDB.open("rotalog:supplier-product-images", 1);
        let blocked = false;
        request.onupgradeneeded = () => request.result.createObjectStore("images");
        request.onblocked = () => { blocked = true; reject(new Error("Armazenamento de imagens bloqueado. Feche outras abas do portal e tente novamente.")); };
        request.onerror = () => reject(new Error("Não foi possível abrir o armazenamento de imagens."));
        request.onsuccess = () => {
            if (blocked) { request.result.close(); return; }
            request.result.onversionchange = () => request.result.close();
            resolve(request.result);
        };
    });
}

async function access<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await openDatabase();
    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = database.transaction("images", mode);
            const request = operation(transaction.objectStore("images"));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(new Error("Não foi possível armazenar ou carregar a imagem. Verifique o espaço e as permissões do navegador."));
        });
    } finally { database.close(); }
}

// Adaptador local: a futura API deve implementar este mesmo contrato.
// A chave composta impede leitura e exclusão por outra organização.
export const productImageStorage: ProductImageStorage = {
    async put(organizationId, file) {
        if (!organizationId) throw new Error("Organização inválida para a imagem.");
        validateProductImage(file);
        const reference = `product-image:${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("")}`;
        await access("readwrite", store => store.add(file, [organizationId, reference]));
        return reference;
    },
    get: (organizationId, reference) => access("readonly", store => store.get([organizationId, reference])),
    async remove(organizationId, reference) { await access("readwrite", store => store.delete([organizationId, reference])); },
};
