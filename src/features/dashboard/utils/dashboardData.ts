import type { SupplierOrder } from "../../orders/mocks/orders.mock";
import { getOrderStage, type OrderStage } from "../../orders/utils/orderStage";
import type { ProductAvailability } from "../../products/mocks/products.mock";

export const stageDefinitions: { id: OrderStage; name: string; color: string }[] = [
    { id: "new", name: "Novos", color: "#2563eb" },
    { id: "accepted", name: "Aceitos", color: "#059669" },
    { id: "separating", name: "Em separação", color: "#d97706" },
    { id: "ready", name: "Prontos para coleta", color: "#0d9488" },
    { id: "transport", name: "Em transporte", color: "#7c3aed" },
    { id: "completed", name: "Finalizados", color: "#64748b" },
];

export function getDashboardYears(orders: SupplierOrder[], organizationId: string, now = new Date()) {
    const current = Number(orderDay(now.toISOString()).slice(0, 4));
    return [...new Set([current, ...orders.filter(order => order.organizationId === organizationId).map(order => Number(orderDay(order.date).slice(0, 4))).filter(year => year > 0)])].sort((a, b) => b - a);
}

export function getDashboardOrders(orders: SupplierOrder[], organizationId: string, year?: number) {
    const scoped = orders.filter(order => order.organizationId === organizationId && (year === undefined || Number(orderDay(order.date).slice(0, 4)) === year));
    return {
        metrics: [
            { id: "received", title: "Pedidos recebidos", value: scoped.length },
            { id: "pending", title: "Aguardando aceite", value: scoped.filter(order => order.commercialStatus === "Aguardando aceite").length },
            { id: "preparing", title: "Em preparação", value: scoped.filter(order => order.commercialStatus === "Aceito" && (order.custodyStatus === "Aguardando separação" || order.custodyStatus === "Em separação")).length },
            { id: "ready", title: "Prontos para coleta", value: scoped.filter(order => order.custodyStatus === "Pronto para coleta").length },
        ],
        stages: stageDefinitions.map(stage => ({ ...stage, count: scoped.filter(order => getOrderStage(order) === stage.id).length })),
        recent: [...scoped].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0, 5),
    };
}

const dayFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" });
export function orderDay(date: string): string {
    if (typeof date !== "string" || !date.trim()) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const parsed = new Date(`${date}T00:00:00Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
    }
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : dayFormatter.format(parsed);
}

export function getDailyOrders(orders: SupplierOrder[], organizationId: string, days: number, now = new Date(), year?: number) {
    const today = dayFormatter.format(now);
    const selectedYear = year ?? Number(today.slice(0, 4));
    const endDay = selectedYear === Number(today.slice(0, 4)) ? today : `${selectedYear}-12-31`;
    const end = Date.parse(`${endDay}T00:00:00Z`);
    const start = Math.max(end - (days - 1) * 86_400_000, Date.parse(`${selectedYear}-01-01T00:00:00Z`));
    const counts = new Map<string, number>();
    for (const order of orders) {
        if (order.organizationId !== organizationId) continue;
        const day = orderDay(order.date);
        counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from({ length: Math.round((end - start) / 86_400_000) + 1 }, (_, index) => {
        const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
        return { date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, count: counts.get(date) ?? 0 };
    });
}

export function getCatalogDistribution(products: { availability: ProductAvailability }[]) {
    return [
        { name: "Disponíveis", availability: "Disponível", color: "#059669" },
        { name: "Estoque baixo", availability: "Estoque baixo", color: "#d97706" },
        { name: "Indisponíveis", availability: "Indisponível", color: "#64748b" },
    ].map(group => ({ name: group.name, color: group.color, count: products.filter(product => product.availability === group.availability).length }));
}
