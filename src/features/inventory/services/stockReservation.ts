import type { SupplierOrder } from "../../orders/mocks/orders.mock";
import type { SupplierProduct } from "../../products/mocks/products.mock";
import type { StockMovement } from "../models/stockMovement";

export type StockReservation = {
    reservedAt: string;
    items: { productId: string; quantity: number }[];
    movements?: StockMovement[];
};
export type StockBalance = { physical: number; reserved: number; available: number };

export function getStockBalance(product: SupplierProduct, orders: SupplierOrder[]): StockBalance {
    let reserved = 0;
    for (const order of orders) {
        if (order.organizationId !== product.organizationId || !order.stockReservation) continue;
        const reservation = order.stockReservation;
        if (!Array.isArray(reservation.items) || !reservation.items.length) throw new Error("Reserva de estoque salva inválida.");
        for (const item of reservation.items) {
            if (!item || typeof item.productId !== "string" || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Reserva de estoque salva inválida.");
            if (item.productId === product.id) reserved += item.quantity;
        }
    }
    if (!Number.isFinite(reserved) || reserved > product.stock) throw new Error(`Reserva inconsistente para ${product.id}. Verifique o estoque.`);
    return { physical: product.stock, reserved, available: product.stock - reserved };
}

export function planStockReservation(order: SupplierOrder, products: SupplierProduct[], orders: SupplierOrder[]): StockReservation {
    if (order.stockReservation) throw new Error("Este pedido já possui reserva de estoque.");
    if (!Array.isArray(order.orderItems) || !order.orderItems.length) throw new Error("Pedido sem itens válidos. Informe produtos do catálogo antes de aceitar.");
    const quantities = new Map<string, number>();
    for (const item of order.orderItems) {
        if (!item || typeof item.productId !== "string" || !item.productId.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("O pedido contém produto ou quantidade inválida.");
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const items = Array.from(quantities, ([productId, quantity]) => {
        const product = products.find((candidate) => candidate.id === productId && candidate.organizationId === order.organizationId);
        if (!product) throw new Error(`Produto ${productId} não encontrado no catálogo deste fornecedor.`);
        const balance = getStockBalance(product, orders);
        if (!Number.isFinite(quantity) || balance.available < quantity) throw new Error(`Estoque insuficiente para ${product.name} (${product.id}): disponível ${balance.available}, solicitado ${quantity}.`);
        return { productId, quantity };
    });
    return { reservedAt: new Date().toISOString(), items };
}
