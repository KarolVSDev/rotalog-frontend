import type { CatalogProduct } from "../../products/api/catalogRepository";
import type { Offer } from "../../products/api/offersRepository";

export type BuyerCatalogPage = {
    products: { items: CatalogProduct[]; total: number; page: number; page_size: number };
    offers: Offer[];
};

const pageSize = 25;
const maximumQuantity = 2_147_483_647;

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
