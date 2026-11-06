import { getStockBalance } from "../../inventory/services/stockReservation";
import { getSupplierProducts, validateProduct } from "../../products/services/supplierProducts.service";
import type { SupplierOrder, SupplierOrderItem } from "../mocks/orders.mock";

// Somente monta itens; a reserva continua ocorrendo exclusivamente no aceite.
export function getTestOrderItems(organizationId: string, orders: SupplierOrder[]): SupplierOrderItem[] {
    const products = getSupplierProducts(organizationId);
    const items: SupplierOrderItem[] = [];
    for (const product of products) {
        if (product.organizationId !== organizationId || validateProduct(product).length) continue;
        const { available } = getStockBalance(product, orders);
        if (!Number.isFinite(available) || available <= 0) continue;
        items.push({
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: Math.min(1, available),
        });
        if (items.length === 2) break;
    }
    if (!items.length) throw new Error("Não há produtos com estoque disponível neste fornecedor para criar um pedido de teste.");
    return items;
}
