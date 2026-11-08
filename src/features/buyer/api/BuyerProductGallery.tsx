import { useMemo, useState, type KeyboardEvent } from "react";
import { AuthenticatedProductImage } from "../../../shared/components/AuthenticatedProductImage";
import type { CatalogProduct } from "../../products/api/catalogRepository";

export function BuyerProductGallery({ product }: { product: CatalogProduct }) {
    const images = useMemo(() => {
        const available = product.images?.length
            ? [...product.images].sort((left, right) => left.position - right.position)
            : product.primary_image ? [product.primary_image] : [];
        if (product.primary_image && !available.some(image => image.id === product.primary_image?.id)) {
            available.unshift(product.primary_image);
        }
        return available;
    }, [product.images, product.primary_image]);
    const primaryImageId = product.primary_image?.id
        ?? images.find(image => image.is_primary)?.id
        ?? images[0]?.id;
    const [selection, setSelection] = useState<{ productId: string; imageId: string | undefined }>({
        productId: product.id,
        imageId: primaryImageId,
    });
    const selectedId = selection.productId === product.id && images.some(image => image.id === selection.imageId)
        ? selection.imageId
        : primaryImageId;
    const selectedIndex = images.findIndex(image => image.id === selectedId);
    const selectedImage = images[selectedIndex] ?? null;

    function selectImage(id: string) {
        setSelection({ productId: product.id, imageId: id });
    }

    function move(direction: -1 | 1) {
        if (images.length < 2) return;
        const nextIndex = (Math.max(0, selectedIndex) + direction + images.length) % images.length;
        selectImage(images[nextIndex].id);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
        }
    }

    return (
        <section
            aria-label={`Galeria de imagens de ${product.name}`}
            onKeyDown={handleKeyDown}
            className="min-w-0"
        >
            <div role="group" aria-label="Imagem principal exibida" className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${selectedImage ? "ring-2 ring-blue-600 ring-offset-2" : ""}`}>
                <AuthenticatedProductImage
                    productId={product.id}
                    image={selectedImage}
                    name={product.name}
                    className="h-64 w-full sm:h-80"
                    lazy={false}
                />
                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Imagem anterior"
                            onClick={() => move(-1)}
                            className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                <path fillRule="evenodd" d="M12.78 4.22a.75.75 0 0 1 0 1.06L8.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/>
                            </svg>
                        </button>
                        <button
                            type="button"
                            aria-label="Próxima imagem"
                            onClick={() => move(1)}
                            className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                <path fillRule="evenodd" d="M7.22 4.22a.75.75 0 0 1 0 1.06L11.94 10l-4.72 4.72a.75.75 0 1 1 1.06 1.06l5.25-5.25a.75.75 0 0 1 0-1.06l-5.25-5.25a.75.75 0 0 1-1.06 0Z" clipRule="evenodd"/>
                            </svg>
                        </button>
                    </>
                )}
            </div>
            {images.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p aria-live="polite" className="text-xs font-medium text-slate-600">
                        Imagem {Math.max(selectedIndex + 1, 1)} de {images.length}
                    </p>
                    {images.length > 1 && (
                        <ul aria-label="Outras imagens do produto" className="flex flex-wrap gap-2">
                            {images.map((image, index) => image.id !== selectedImage?.id && (
                                    <li key={image.id}>
                                        <button
                                            type="button"
                                            aria-label={`Mostrar imagem ${index + 1}${image.is_primary ? ", principal" : ""}`}
                                            onClick={() => selectImage(image.id)}
                                            className="block h-16 w-16 overflow-hidden rounded-lg border-2 border-slate-200 transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                        >
                                            <AuthenticatedProductImage
                                                productId={product.id}
                                                image={image}
                                                name={product.name}
                                                className="h-full w-full"
                                            />
                                        </button>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}
