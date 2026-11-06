import type { SupplierOrder } from "../mocks/orders.mock";

export function getOrderDeadline(order: SupplierOrder, now: number) {
    let zone = order.timeZone;
    let invalidZone = false;
    if (zone) {
        try { new Intl.DateTimeFormat("pt-BR", { timeZone: zone }).format(); }
        catch { invalidZone = true; zone = undefined; }
    }
    const zoneMessage = invalidZone ? "Fuso do pedido inválido. Exibição em America/Manaus."
        : zone ? `Fuso do pedido: ${zone}.` : "Fuso do pedido não informado. Exibição em America/Manaus.";
    if (!order.acceptanceDeadline) return { message: "Prazo para aceite não informado.", zoneMessage, remaining: null };
    // Sem offset não há um instante inequívoco para calcular o contador.
    const instant = /T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/i.test(order.acceptanceDeadline) ? Date.parse(order.acceptanceDeadline) : NaN;
    if (!Number.isFinite(instant)) return { message: "Prazo para aceite inválido ou sem fuso explícito.", zoneMessage, remaining: null };
    const date = new Date(instant).toLocaleString("pt-BR", { timeZone: zone ?? "America/Manaus", timeZoneName: "short" });
    return { message: `Prazo para aceite: ${date}.`, zoneMessage, remaining: order.commercialStatus === "Aguardando aceite" ? Math.max(0, instant - now) : null };
}

export function formatRemaining(milliseconds: number) {
    if (milliseconds <= 0) return "Prazo encerrado";
    const seconds = Math.ceil(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${days ? `${days}d ` : ""}${hours}h ${minutes}min ${seconds % 60}s restantes`;
}
