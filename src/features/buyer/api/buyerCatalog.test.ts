import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "../../products/api/catalogRepository";
import type { Offer } from "../../products/api/offersRepository";
import { BuyerReadRepository } from "./BuyerReadRepository";
import { buyerCatalogPage, filterAndSortBuyerProducts, isPurchasableOffer } from "./buyerCatalog";
import { validateCart, type Offer as CartOffer } from "./buyerRepository";

function product(id: string, publication_state = "PUBLISHED"): CatalogProduct {
    return {
        id,
        name: `Produto ${id}`,
        brand: "Marca",
        category: "ALIMENTO_SECO_INDUSTRIALIZADO",
        gtin: null,
        net_content: 500,
        net_content_unit: "g",
        packaging_type: "SACO",
        packaging_quantity: 1,
        gross_weight_grams: 500,
        volume_cm3: 500,
        variant_attributes: {},
        publication_state,
        version: 1,
        demo_run_id: "run",
        is_synthetic: true,
    };
}

function offer(productId: string, overrides: Partial<Offer> = {}): Offer {
    return {
        id: `offer-${productId}`,
        product_id: productId,
        product_name: `Produto ${productId}`,
        supplier_organization_id: "supplier",
        supplier_name: "Fornecedor",
        warehouse_id: "warehouse",
        region: "Centro",
        unit_price: "10.00",
        currency: "BRL",
        minimum_order_quantity: 2,
        available_quantity: 5,
        version: 1,
        is_active: true,
        demo_run_id: "run",
        is_synthetic: true,
        ...overrides,
    };
}

describe("buyer catalog eligibility", () => {
    it("filters by category, brand, and offer stock and sorts without changing offer data", () => {
        const products = [
            { ...product("rice"), name: "Arroz", brand: "Marca A", category: "GRAOS" },
            { ...product("beans"), name: "Feijão", brand: "Marca B", category: "GRAOS" },
            { ...product("oil"), name: "Óleo", brand: "Marca A", category: "OLEOS" },
        ];
        const offers = [
            offer("rice", { unit_price: "10.00", minimum_order_quantity: 2, available_quantity: 8 }),
            offer("beans", { unit_price: "5.00", minimum_order_quantity: 2, available_quantity: 2 }),
            offer("oil", { unit_price: "7.00", minimum_order_quantity: 1, available_quantity: 5 }),
        ];

        expect(filterAndSortBuyerProducts(products, offers, {
            category: "GRAOS",
            brand: "Marca A",
            stock: "above-minimum",
            sort: "recommended",
        }).map(item => item.id)).toEqual(["rice"]);
        expect(filterAndSortBuyerProducts(products, offers, {
            category: "",
            brand: "",
            stock: "at-minimum",
            sort: "recommended",
        }).map(item => item.id)).toEqual(["beans"]);
        expect(filterAndSortBuyerProducts(products, offers, {
            category: "",
            brand: "",
            stock: "any",
            sort: "price-ascending",
        }).map(item => item.id)).toEqual(["beans", "oil", "rice"]);
        expect(filterAndSortBuyerProducts(products, offers, {
            category: "",
            brand: "",
            stock: "any",
            sort: "name",
        }).map(item => item.id)).toEqual(["rice", "beans", "oil"]);
        expect(offers.map(item => item.unit_price)).toEqual(["10.00", "5.00", "7.00"]);
    });

    it("only keeps published products with at least one active, priced, stock-available offer", () => {
        const products = [
            product("no-offer"),
            product("valid"),
            product("inactive"),
            product("zero-price"),
            product("multiple"),
            product("insufficient-stock"),
            product("draft", "DRAFT"),
        ];
        const offers = [
            offer("valid"),
            offer("inactive", { is_active: false }),
            offer("zero-price", { unit_price: "0.00" }),
            offer("multiple", { unit_price: "0.00" }),
            offer("multiple", { id: "valid-second-offer" }),
            offer("insufficient-stock", { available_quantity: 1 }),
        ];

        const result = buyerCatalogPage(products, offers, "", 1);
        expect(result.products.items.map(item => item.id)).toEqual(["valid", "multiple"]);
        expect(result.products.total).toBe(2);
        expect(result.offers.map(item => item.id)).toEqual(["offer-valid", "valid-second-offer"]);
    });

    it("searches eligible supplier names and paginates/counts after eligibility filtering", async () => {
        const products = Array.from({ length: 28 }, (_, index) => product(`item-${index + 1}`));
        const offers = products.map((item, index) => offer(item.id, { supplier_name: `Supplier ${index + 1}` }));
        const transport = async <T,>(path: string): Promise<T> => {
            const url = new URL(path, "http://localhost");
            const page = Number(url.searchParams.get("page"));
            const pageItems = url.pathname.endsWith("/products") ? products : offers;
            return {
                items: pageItems.slice((page - 1) * 25, page * 25),
                total: pageItems.length,
                page,
                page_size: 25,
            } as T;
        };
        const repository = new BuyerReadRepository("buyer", transport);

        const secondPage = await repository.availableCatalog("", 2);
        expect(secondPage.products.total).toBe(28);
        expect(secondPage.products.items.map(item => item.id)).toEqual(["item-26", "item-27", "item-28"]);
        const searched = await repository.availableCatalog("supplier 27", 1);
        expect(searched.products.total).toBe(1);
        expect(searched.products.items[0].id).toBe("item-27");
    });

    it("removes a product from the next catalog read when its last eligible offer disappears", async () => {
        const products = [product("only-offer")];
        let currentOffers: Offer[] = [offer("only-offer")];
        const transport = async <T,>(path: string): Promise<T> => {
            const page = Number(new URL(path, "http://localhost").searchParams.get("page"));
            const items = path.includes("/products") ? products : currentOffers;
            return { items, total: items.length, page, page_size: 25 } as T;
        };
        const repository = new BuyerReadRepository("buyer", transport);
        expect((await repository.availableCatalog("", 1)).products.items).toHaveLength(1);
        currentOffers = [];
        expect((await repository.availableCatalog("", 1)).products.items).toHaveLength(0);
    });

    it("rejects inactive, zero-price, and stock-insufficient offers at eligibility and cart validation", () => {
        const valid = offer("valid");
        expect(isPurchasableOffer(valid)).toBe(true);
        expect(isPurchasableOffer({ ...valid, is_active: false })).toBe(false);
        expect(isPurchasableOffer({ ...valid, unit_price: "0.00" })).toBe(false);
        expect(isPurchasableOffer({ ...valid, unit_price: "invalid" })).toBe(false);
        expect(isPurchasableOffer({ ...valid, unit_price: "1000000000000.00" })).toBe(false);
        expect(isPurchasableOffer({ ...valid, available_quantity: 1 })).toBe(false);

        const cartOffer: CartOffer = valid;
        expect(() => validateCart([cartOffer], [2])).not.toThrow();
        expect(() => validateCart([{ ...cartOffer, unit_price: "0.00" }], [2])).toThrow();
        expect(() => validateCart([{ ...cartOffer, is_active: false }], [2])).toThrow();
    });
});
