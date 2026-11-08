import type { InventoryRepository } from "../../inventory/api/inventoryRepository";
import type { CatalogProduct } from "./catalogRepository";
import type { Offer, OffersRepository, Warehouse } from "./offersRepository";

export type InitialStockResult =
    | { status: "complete"; offer: Offer }
    | { status: "partial"; offer: Offer; error: unknown };

export async function createOfferWithInitialStock(input: {
    offers: Pick<OffersRepository, "create">;
    inventory: Pick<InventoryRepository, "initializeOfferStock">;
    product: CatalogProduct;
    warehouse: Warehouse;
    price: string;
    minimumOrderQuantity: string;
    initialStock: string;
    safetyStock: string;
}): Promise<InitialStockResult> {
    const offer = await input.offers.create(
        input.product,
        input.warehouse,
        input.price,
        input.minimumOrderQuantity,
    );
    try {
        await input.inventory.initializeOfferStock(
            offer,
            input.warehouse,
            input.initialStock,
            input.safetyStock,
        );
        return { status: "complete", offer };
    } catch (error) {
        return { status: "partial", offer, error };
    }
}
