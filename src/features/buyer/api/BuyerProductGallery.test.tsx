import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { CanonicalProductImage } from "../../../shared/api/productImageTypes";
import type { CatalogProduct } from "../../products/api/catalogRepository";
import { BuyerProductGallery } from "./BuyerProductGallery";

vi.mock("../../../shared/components/AuthenticatedProductImage", () => ({
    AuthenticatedProductImage: ({ image, name, className }: {
        image?: CanonicalProductImage | null;
        name: string;
        className?: string;
    }) => image
        ? <img alt={image.alt_text || name} data-image-id={image.id} data-testid={className?.includes("h-64") ? "main-image" : "thumbnail-image"}/>
        : <div role="img" aria-label={`Imagem de ${name} não disponível`} data-testid="image-fallback"/>,
}));

const first: CanonicalProductImage = {
    id: "image-1", file_id: "file-1", position: 0, is_primary: false,
    alt_text: "Frente da embalagem", mime_type: "image/jpeg", size_bytes: 10,
    sha256: "hash-1", width: 800, height: 600, content_url: "/api/v1/image-1",
    requires_authentication: true,
};
const primary: CanonicalProductImage = {
    ...first, id: "image-2", file_id: "file-2", position: 1, is_primary: true,
    alt_text: "Embalagem principal", sha256: "hash-2",
};
const product = {
    id: "product-1", name: "Arroz", brand: "Marca",
    category: "ALIMENTO_SECO_INDUSTRIALIZADO", gtin: null,
    net_content: 5000, net_content_unit: "g", packaging_type: "Fardo",
    packaging_quantity: 6, gross_weight_grams: 31000, volume_cm3: 60000,
    variant_attributes: {}, publication_state: "PUBLISHED", version: 1,
    demo_run_id: "run", is_synthetic: true,
} satisfies CatalogProduct;

afterEach(cleanup);

test("shows a single image as the main image without redundant thumbnails", () => {
    render(<BuyerProductGallery product={{...product, images: [first], primary_image: first}}/>);

    expect(screen.getByTestId("main-image").getAttribute("data-image-id")).toBe(first.id);
    expect(screen.getByText("Imagem 1 de 1")).toBeTruthy();
    expect(screen.getByRole("group", {name: "Imagem principal exibida"}).className).toContain("ring-blue-600");
    expect(screen.queryByRole("list", {name: "Outras imagens do produto"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Imagem anterior"})).toBeNull();
});

test("navigates multiple images with thumbnails and arrow keys", () => {
    render(<BuyerProductGallery product={{...product, images: [first, primary], primary_image: primary}}/>);

    expect(screen.getByTestId("main-image").getAttribute("data-image-id")).toBe(primary.id);
    const firstThumb = screen.getByRole("button", {name: "Mostrar imagem 1"});
    fireEvent.click(firstThumb);
    expect(screen.getByTestId("main-image").getAttribute("data-image-id")).toBe(first.id);

    fireEvent.keyDown(screen.getByRole("region", {name: "Galeria de imagens de Arroz"}), {key: "ArrowRight"});
    expect(screen.getByTestId("main-image").getAttribute("data-image-id")).toBe(primary.id);
    expect(screen.getByText("Imagem 2 de 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {name: "Próxima imagem"}));
    expect(screen.getByTestId("main-image").getAttribute("data-image-id")).toBe(first.id);
    expect(screen.getByRole("button", {name: "Mostrar imagem 2, principal"})).toBeTruthy();
});

test("keeps the existing image fallback for products without images", () => {
    render(<BuyerProductGallery product={product}/>);

    expect(screen.getByTestId("image-fallback").getAttribute("aria-label")).toBe("Imagem de Arroz não disponível");
    expect(screen.queryByRole("list", {name: "Outras imagens do produto"})).toBeNull();
});
