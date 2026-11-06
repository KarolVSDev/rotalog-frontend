import { readSupplierOrders, subscribeSupplierOrders } from "../../orders/services/supplierOrders.service";
import { getSupplierProducts, subscribeSupplierProducts } from "../../products/services/supplierProducts.service";
import type { StockMovement } from "../models/stockMovement";
import { collectStockMovements } from "./stockMovements";

export interface SupplierStockMovementsService {
    list(organizationId: string): StockMovement[];
    subscribe(onChange: () => void): () => void;
}

// Consulta sem escrita. A futura API pode substituir este adaptador e o hook.
export const localSupplierStockMovementsService: SupplierStockMovementsService = {
    list(organizationId) {
        if (!organizationId) throw new Error("Organização inválida para consultar movimentações.");
        return collectStockMovements(organizationId, readSupplierOrders(), getSupplierProducts(organizationId));
    },
    subscribe(onChange) {
        const orders = subscribeSupplierOrders(onChange);
        const products = subscribeSupplierProducts(onChange);
        return () => { orders(); products(); };
    },
};
