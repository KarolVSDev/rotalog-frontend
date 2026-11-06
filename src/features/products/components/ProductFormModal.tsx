import { useState, useRef, type FormEvent } from "react";
import type { SupplierProduct } from "../mocks/products.mock";
import { useId, type ChangeEvent } from "react";
import { saveProductWithImage } from "../services/saveProductWithImage";
import { validateProductImage } from "../services/productImages.service";
import { ProductImage } from "./ProductImage";
import { ProductManagementDialog } from "./ProductManagementDialog";

type Props = { organizationId: string; product?: SupplierProduct; onClose: () => void; onSaved: (warning?: string | null) => void };
export function ProductFormModal({ organizationId, product, onClose, onSaved }: Props) {
    const [error, setError] = useState<string | null>(null);
    const saving = useRef(false);
    const [pending, setPending] = useState(false);
    const [image, setImage] = useState<File | null | undefined>(undefined);
    const [imageError, setImageError] = useState<string | null>(null);
    const [checkingImage, setCheckingImage] = useState(false);
    const uploadId = useId();
    async function selectImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        setImageError(null);
        setCheckingImage(true);
        try {
            validateProductImage(file);
            const bitmap = await createImageBitmap(file);
            bitmap.close();
            setImage(file);
        } catch (failure) { setImageError(failure instanceof Error && failure.message.includes("imagem") ? failure.message : "Não foi possível ler esta imagem. Selecione um arquivo JPG, PNG ou WebP válido."); }
        finally { setCheckingImage(false); }
    }
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving.current || checkingImage) return;
        saving.current = true;
        setPending(true);
        setError(null);
        try {
            const data = new FormData(event.currentTarget);
            const changes = { name: String(data.get("name") ?? ""), category: String(data.get("category") ?? ""), unit: String(data.get("unit") ?? ""), price: Number(data.get("price")) };
            const result = await saveProductWithImage({ organizationId, product, input: { ...changes, id: product?.id ?? String(data.get("id") ?? ""), stock: product?.stock ?? Number(data.get("stock")) }, image });
            onSaved(result.warning);
        } catch (failure) { saving.current = false; setPending(false); setError(failure instanceof Error ? failure.message : "Falha ao salvar produto."); }
    }
    const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-2 focus:outline-blue-200";
    return <ProductManagementDialog title={product ? "Editar produto" : "Novo produto"} onClose={onClose} busy={pending || checkingImage}>
        <form onSubmit={submit}>
            <fieldset disabled={pending || checkingImage} className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <legend className="px-1 text-sm font-medium">Imagem do produto</legend>
                <div className="flex flex-wrap items-center gap-4">
                    <ProductImage organizationId={organizationId} imageRef={image === undefined ? product?.imageRef : undefined} file={image ?? undefined} name={product?.name ?? "produto"} className="h-24 w-24 bg-white" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <p id="product-image-help" className="text-xs text-slate-500">JPG, PNG ou WebP, até 2 MB. A imagem fica neste navegador.</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <input id={uploadId} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Imagem do produto" aria-describedby="product-image-help" onChange={(event) => void selectImage(event)} className="peer sr-only" />
                            <label htmlFor={uploadId} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600">{image || (image === undefined && product?.imageRef) ? "Substituir imagem" : "Selecionar imagem"}</label>
                            {(image || (image === undefined && product?.imageRef)) && <button type="button" onClick={() => { setImage(null); setImageError(null); }} className="rounded text-xs font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">Remover imagem</button>}
                        </div>
                        {image && <p className="break-all text-xs text-slate-500">{image.name}</p>}
                        {checkingImage && <p role="status" className="text-xs text-slate-500">Validando imagem…</p>}
                    </div>
                </div>
                {imageError && <p role="alert" className="mt-3 text-sm text-red-700">{imageError}</p>}
            </fieldset>
            <fieldset disabled={pending}>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Código do produto<input name="id" required defaultValue={product?.id} readOnly={!!product} className={`${fieldClass} read-only:bg-slate-100`} /></label>
                <label className="text-sm font-medium">Nome<input name="name" required defaultValue={product?.name} className={fieldClass} /></label>
                <label className="text-sm font-medium">Categoria<input name="category" required defaultValue={product?.category} className={fieldClass} /></label>
                <label className="text-sm font-medium">Unidade de medida<input name="unit" required defaultValue={product?.unit} placeholder="Ex.: Unidade, kg, m³" className={fieldClass} /></label>
                <label className="text-sm font-medium">Preço unitário (R$)<input name="price" type="number" required min="0.01" step="0.01" defaultValue={product?.price} className={fieldClass} /></label>
                {!product && <label className="text-sm font-medium">Quantidade inicial em estoque<input name="stock" type="number" required min="0" step="any" defaultValue="0" className={fieldClass} /></label>}
            </div>
            {product && <p className="mt-4 text-xs text-slate-500">Código e fornecedor são preservados. Quantidades devem ser ajustadas no módulo Estoque, com registro de movimentação.</p>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </fieldset>
            <footer className="mt-6 flex justify-end gap-2"><button type="button" disabled={pending || checkingImage} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">Cancelar</button><button type="submit" disabled={pending || checkingImage} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">{pending ? "Salvando…" : "Salvar produto"}</button></footer>
        </form>
    </ProductManagementDialog>;
}
