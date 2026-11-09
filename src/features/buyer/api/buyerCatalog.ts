import type { CatalogProduct } from "../../products/api/catalogRepository";
import type { Offer } from "../../products/api/offersRepository";

export type BuyerCatalogPage = {
    products: { items: CatalogProduct[]; total: number; page: number; page_size: number };
    offers: Offer[];
};

export type BuyerCatalogFilters = {
    category: string;
    brand: string;
    stock: "any" | "above-minimum" | "at-minimum";
    sort: "recommended" | "name" | "price-ascending" | "price-descending";
};

const pageSize = 25;
const maximumQuantity = 2_147_483_647;

function priceInCents(price: string): bigint {
    const [whole, fraction = ""] = price.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function lowestOffer(offers: Offer[], productId: string): Offer | undefined {
    return offers.reduce<Offer | undefined>((lowest, offer) => {
        if (offer.product_id !== productId || !isPurchasableOffer(offer)) return lowest;
        return !lowest || priceInCents(offer.unit_price) < priceInCents(lowest.unit_price)
            ? offer
            : lowest;
    }, undefined);
}

export function isPurchasableOffer(
    offer: Pick<Offer, "is_active" | "unit_price" | "minimum_order_quantity" | "available_quantity">,
): boolean {
    if (
        !offer.is_active ||
        !Number.isSafeInteger(offer.minimum_order_quantity) ||
        offer.minimum_order_quantity < 1 ||
        offer.minimum_order_quantity > maximumQuantity ||
        !Number.isSafeInteger(offer.available_quantity) ||
        offer.available_quantity < offer.minimum_order_quantity ||
        offer.available_quantity > maximumQuantity ||
        !/^\d{1,12}(?:\.\d{1,2})?$/.test(offer.unit_price)
    ) {
        return false;
    }

    const [whole, fraction = ""] = offer.unit_price.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")) > 0n;
}

export function buyerCatalogPage(
    products: CatalogProduct[],
    offers: Offer[],
    search: string,
    requestedPage: number,
): BuyerCatalogPage {
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
        throw new Error("A página do catálogo deve ser um número inteiro positivo.");
    }

    const availableProducts = availableBuyerProducts(products, offers, search);
    const eligibleOffers = offers.filter(isPurchasableOffer);
    const total = availableProducts.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);

    return {
        products: {
            items: availableProducts.slice((page - 1) * pageSize, page * pageSize),
            total,
            page,
            page_size: pageSize,
        },
        offers: eligibleOffers,
    };
}

export function availableBuyerProducts(
    products: CatalogProduct[],
    offers: Offer[],
    search: string,
): CatalogProduct[] {
    const eligibleOffers = offers.filter(isPurchasableOffer);
    const offersByProduct = new Map<string, Offer[]>();
    for (const offer of eligibleOffers) {
        const productOffers = offersByProduct.get(offer.product_id) ?? [];
        productOffers.push(offer);
        offersByProduct.set(offer.product_id, productOffers);
    }

    const term = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter(product => {
        if (product.publication_state !== "PUBLISHED") return false;
        const productOffers = offersByProduct.get(product.id);
        if (!productOffers?.length) return false;
        if (!term) return true;
        return [
            product.name,
            product.brand,
            product.category,
            ...productOffers.map(offer => offer.supplier_name),
        ].some(value => value.toLocaleLowerCase("pt-BR").includes(term));
    });
}

export function filterAndSortBuyerProducts(
    products: CatalogProduct[],
    offers: Offer[],
    filters: BuyerCatalogFilters,
): CatalogProduct[] {
    const filtered = products.filter(product => {
        if (filters.category && product.category !== filters.category) return false;
        if (filters.brand && product.brand !== filters.brand) return false;
        if (filters.stock !== "any") {
            const matchingStock = offers.some(offer => {
                if (offer.product_id !== product.id || !isPurchasableOffer(offer)) return false;
                return filters.stock === "above-minimum"
                    ? offer.available_quantity > offer.minimum_order_quantity
                    : offer.available_quantity === offer.minimum_order_quantity;
            });
            if (!matchingStock) return false;
        }
        return true;
    });

    if (filters.sort === "name") {
        return filtered.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    }
    if (filters.sort === "price-ascending" || filters.sort === "price-descending") {
        const direction = filters.sort === "price-ascending" ? 1 : -1;
        return filtered.sort((left, right) => {
            const leftOffer = lowestOffer(offers, left.id);
            const rightOffer = lowestOffer(offers, right.id);
            if (!leftOffer || !rightOffer) return leftOffer ? -1 : rightOffer ? 1 : 0;
            const leftPrice = priceInCents(leftOffer.unit_price);
            const rightPrice = priceInCents(rightOffer.unit_price);
            return leftPrice === rightPrice ? 0 : leftPrice < rightPrice ? -direction : direction;
        });
    }
    return filtered;
}
