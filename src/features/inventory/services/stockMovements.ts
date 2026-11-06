import type { SupplierOrder } from "../../orders/mocks/orders.mock";
import type { SupplierProduct } from "../../products/mocks/products.mock";
import type { StockMovement, StockMovementSource, StockMovementType } from "../models/stockMovement";

// Chaves de idempotência: só há uma reserva por pedido/produto e uma entrada
// inicial por produto. Não dependem do relógio nem de APIs de contexto seguro.
export function createReservationMovements(order: SupplierOrder, products: SupplierProduct[]): StockMovement[] {
    const reservation = order.stockReservation;
    if (!reservation) throw new Error("Não é possível registrar movimento sem reserva.");
    return reservation.items.map(item => {
        const product = products.find(product => product.id === item.productId && product.organizationId === order.organizationId);
        if (!product) throw new Error("Produto da reserva não encontrado nesta organização.");
        return {
            id: JSON.stringify(["reservation", order.organizationId, order.id, item.productId]),
            organizationId: order.organizationId,
            productId: item.productId,
            productName: product.name,
            unit: product.unit,
            type: "reservation",
            quantity: item.quantity,
            occurredAt: reservation.reservedAt,
            orderId: order.id,
            source: "order-acceptance",
        };
    });
}

export function createInitialStockMovement(product: SupplierProduct, source: "product-create" | "xlsx-import"): StockMovement {
    return {
        id: JSON.stringify(["initial-stock", product.organizationId, product.id]),
        organizationId: product.organizationId,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type: "initial-stock",
        quantity: product.stock,
        occurredAt: new Date().toISOString(),
        source,
    };
}

function isMovement(value: unknown): value is StockMovement {
    if (!value || typeof value !== "object") return false;
    const item = value as StockMovement;
    return [item.id, item.organizationId, item.productId, item.productName, item.unit].every(value => typeof value === "string" && !!value.trim()) &&
        (item.type === "reservation" || item.type === "initial-stock") &&
        ["order-acceptance", "product-create", "xlsx-import"].includes(item.source as StockMovementSource) &&
        Number.isFinite(item.quantity) && item.quantity > 0 && typeof item.occurredAt === "string" && Number.isFinite(Date.parse(item.occurredAt)) &&
        (item.orderId === undefined || typeof item.orderId === "string");
}

// Projeta apenas eventos explicitamente gravados. Reservas/catálogos antigos
// sem o campo de eventos não geram histórico durante a consulta.
export function collectStockMovements(organizationId: string, orders: SupplierOrder[], products: SupplierProduct[]): StockMovement[] {
    const result: StockMovement[] = [];
    const ids = new Set<string>();
    function append(values: unknown, check: (movement: StockMovement) => boolean) {
        if (!Array.isArray(values)) throw new Error("Histórico de movimentações salvo inválido.");
        for (const value of values) {
            if (!isMovement(value) || value.organizationId !== organizationId || !check(value) || ids.has(value.id)) {
                throw new Error("Histórico de movimentações inconsistente. Nenhum dado foi alterado.");
            }
            ids.add(value.id);
            result.push(value);
        }
    }
    for (const order of orders) {
        if (order.organizationId !== organizationId || order.stockReservation?.movements === undefined) continue;
        const reservation = order.stockReservation;
        const movements = reservation.movements;
        if (!Array.isArray(movements) || movements.length !== reservation.items.length || new Set(movements.map(item => item?.productId)).size !== movements.length) throw new Error("Histórico da reserva salvo inválido.");
        append(movements, item => item.type === "reservation" && item.source === "order-acceptance" && item.orderId === order.id &&
            order.commercialStatus === "Aceito" && item.occurredAt === reservation.reservedAt &&
            reservation.items.some(line => line.productId === item.productId && line.quantity === item.quantity));
    }
    for (const product of products) {
        if (product.organizationId !== organizationId || product.stockMovements === undefined) continue;
        if (!Array.isArray(product.stockMovements) || product.stockMovements.length !== 1 || product.stockMovements[0]?.quantity !== product.stock) throw new Error("Histórico do estoque inicial inconsistente.");
        append(product.stockMovements, item => item.type === "initial-stock" && item.productId === product.id && item.orderId === undefined &&
            (item.source === "product-create" || item.source === "xlsx-import"));
    }
    return result.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
}

export function filterStockMovements(movements: StockMovement[], query: string, type: "all" | StockMovementType, displayIds: Map<string, string>): StockMovement[] {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return movements.filter(item => (type === "all" || item.type === type) &&
        [item.productName, item.productId, item.orderId ?? "", item.orderId ? displayIds.get(item.orderId) ?? "" : ""].some(value => value.toLocaleLowerCase("pt-BR").includes(search)));
}
