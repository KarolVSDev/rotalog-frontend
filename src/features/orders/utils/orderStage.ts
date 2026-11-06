import type { SupplierOrder } from "../mocks/orders.mock";

export type OrderStage = "new" | "accepted" | "separating" | "ready" | "transport" | "completed";

// Classificação compartilhada pelo Kanban e pelos relatórios.
export function getOrderStage(order: SupplierOrder): OrderStage {
    if (order.commercialStatus === "Recusado" || order.custodyStatus === "Entregue" || order.status === "Entregue") return "completed";
    if (order.custodyStatus === "Em transporte" || order.status === "Em transporte") return "transport";
    if (order.custodyStatus === "Pronto para coleta") return "ready";
    if (order.custodyStatus === "Em separação" || order.status === "Em separação") return "separating";
    if (order.commercialStatus === "Aceito") return "accepted";
    return "new";
}
