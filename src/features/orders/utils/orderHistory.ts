import type { SupplierOrder } from "../mocks/orders.mock";
import { getOrderStage } from "./orderStage";

export function historyDay(value: string) {
    if (typeof value !== "string" || !value.trim()) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const parsed = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(date);
}

export function getOrderHistoryDay(order: SupplierOrder) {
    const recorded = order.commercialStatus === "Recusado" ? order.rejection?.rejectedAt : order.completedAt;
    return recorded ? historyDay(recorded) : "";
}

export function getOrderHistory(orders: SupplierOrder[], organizationId: string, displayIds: Map<string, string>, filters: { search: string; status: string; from: string; to: string }) {
    const query = filters.search.trim().toLocaleLowerCase("pt-BR");
    const filtered = orders.filter(order => {
        if (order.organizationId !== organizationId || getOrderStage(order) !== "completed") return false;
        const day = getOrderHistoryDay(order);
        const refused = order.commercialStatus === "Recusado";
        return (!query || [order.id, displayIds.get(order.id) ?? "", order.customer].some(value => value.toLocaleLowerCase("pt-BR").includes(query)))
            && (!filters.status || (filters.status === "refused" ? refused : !refused))
            && (!filters.from || day >= filters.from) && (!filters.to || (!!day && day <= filters.to));
    }).sort((a, b) => getOrderHistoryDay(b).localeCompare(getOrderHistoryDay(a)) || a.id.localeCompare(b.id));
    const groups = new Map<string, SupplierOrder[]>();
    for (const order of filtered) {
        const month = getOrderHistoryDay(order).slice(0, 7) || "unknown";
        const records = groups.get(month);
        if (records) records.push(order);
        else groups.set(month, [order]);
    }
    return [...groups].sort(([a], [b]) => a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a)).map(([month, records]) => ({ month, records }));
}
