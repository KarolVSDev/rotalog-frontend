export type StockMovementType = "reservation" | "initial-stock";
export type StockMovementSource = "order-acceptance" | "product-create" | "xlsx-import";

export type StockMovement = {
    id: string;
    organizationId: string;
    productId: string;
    productName: string;
    unit: string;
    type: StockMovementType;
    quantity: number;
    occurredAt: string;
    orderId?: string;
    source: StockMovementSource;
};

export const stockMovementLabels: Record<StockMovementType, string> = {
    reservation: "Reserva de estoque",
    "initial-stock": "Estoque inicial",
};
