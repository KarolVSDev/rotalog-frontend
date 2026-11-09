import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { CatalogProduct } from "../../products/api/catalogRepository";
import { ApiBuyerCatalog } from "./BuyerPages";

const mocks = vi.hoisted(() => ({
    availableCatalog: vi.fn(),
}));

vi.mock("../../auth/hooks/useAuth", () => ({
    useAuth: () => ({
        isLoading: false,
        user: {
            id: "buyer",
            name: "Comprador",
            email: "buyer@example.invalid",
            role: "BUYER_ADMIN",
            organization_id: "buyer-org",
            organizations: [{ id: "buyer-org", name: "Comprador", role: "BUYER_ADMIN" }],
            capabilities: ["catalog:read"],
        },
    }),
}));

vi.mock("./BuyerReadRepository", () => ({
    BuyerReadRepository: vi.fn(function () {
        return { availableCatalog: mocks.availableCatalog };
    }),
}));

const names = [
    "Óleo vegetal",
    "Macarrão",
    "Arroz",
    "Feijão",
    "Farinha de trigo",
    "Açúcar refinado",
    "Café torrado",
    "Leite em pó",
];

function makeProduct(name: string, index: number): CatalogProduct {
    return {
        id: `product-${index}`,
        name,
        brand: "Marca de teste",
        category: "ALIMENTO_SECO_INDUSTRIALIZADO",
        gtin: null,
        net_content: 1000,
        net_content_unit: "g",
        packaging_type: "SACO",
        packaging_quantity: 1,
        gross_weight_grams: 1000,
        volume_cm3: 1000,
        variant_attributes: {},
        publication_state: "PUBLISHED",
        version: 1,
        demo_run_id: "test",
        is_synthetic: true,
    };
}

function renderCatalog() {
    return render(
        <MemoryRouter>
            <Routes>
                <Route element={<Outlet context={{ search: "" }} />}>
                    <Route index element={<ApiBuyerCatalog />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    const products = names.map(makeProduct);
    mocks.availableCatalog.mockResolvedValue({
        products: { items: products, total: products.length, page: 1, page_size: 25 },
        offers: products.map((product, index) => ({
            id: `offer-${index}`,
            product_id: product.id,
            product_name: product.name,
            supplier_organization_id: "supplier-org",
            supplier_name: "Fornecedor de teste",
            warehouse_id: "warehouse",
            unit_price: "10.00",
            currency: "BRL",
            minimum_order_quantity: 1,
            available_quantity: 20,
            version: 1,
            is_active: true,
        })),
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

test("renders compact, aligned catalog cards for all eight products", async () => {
    renderCatalog();
    const cards = await screen.findAllByRole("article");

    expect(cards).toHaveLength(8);
    expect(mocks.availableCatalog).toHaveBeenCalled();

    cards.forEach((card, index) => {
        expect(screen.getByRole("heading", { level: 3, name: names[index] })).toBeTruthy();
        expect(card.className).toContain("h-full");
        expect(card.querySelector("h3")?.className).toContain("line-clamp-2");
        expect(card.firstElementChild?.className).toContain("sm:h-48");
        expect(card.querySelector("a")?.parentElement?.className).toContain("mt-auto");
        expect(card.querySelector("a")?.textContent).toContain("Ver produto");
    });
});
