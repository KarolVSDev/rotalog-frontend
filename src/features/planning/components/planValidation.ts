import type { Destination, EligibleCargo, ManualPlan } from "../api/planTypes";
export type DestinationDraft = { address: string; latitude: string; longitude: string; starts: string; ends: string; service: string };
export const emptyDestination = (): DestinationDraft => ({ address: "", latitude: "", longitude: "", starts: "", ends: "", service: "300" });
export function validateDraft(driver: string, vehicle: string, reason: string, drafts: DestinationDraft[]): void {
    if (!driver || !vehicle) throw new Error("Selecione motorista e veículo.");
    if (reason.trim().length < 5 || reason.trim().length > 500) throw new Error("A justificativa deve ter de 5 a 500 caracteres.");
    if (drafts.length < 1 || drafts.length > 30) throw new Error("Informe de 1 a 30 entregas.");
    let previous = -Infinity;
    for (const [index, draft] of drafts.entries()) {
        const fail = (message: string) => { throw new Error(`Entrega ${index + 1}: ${message}`); };
        if (draft.address.trim().length < 5 || draft.address.trim().length > 500) fail("informe um endereço de 5 a 500 caracteres.");
        for (const [value, limit, label] of [[draft.latitude, 90, "latitude"], [draft.longitude, 180, "longitude"]] as const) {
            if (!/^-?\d+(\.\d{1,6})?$/.test(value.trim()) || Math.abs(Number(value)) > limit) fail(`informe ${label} válida, com até 6 casas decimais.`);
        }
        const start = Date.parse(`${draft.starts}-04:00`), end = Date.parse(`${draft.ends}-04:00`);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.now()) fail("a janela deve terminar no futuro e após o início.");
        if (!/^\d+$/.test(draft.service) || !Number.isSafeInteger(Number(draft.service)) || Number(draft.service) < 1 || Number(draft.service) > 2147483647) fail("tempo de atendimento deve ser um inteiro positivo.");
        if (end - start < Number(draft.service) * 1000 || start < previous) fail("janela insuficiente ou fora da sequência das entregas.");
        previous = start;
    }
}
export function destinationPayload(draft: DestinationDraft, order: string): Destination {
    return { supplier_order_id: order, address: draft.address.trim(), latitude: draft.latitude.trim(), longitude: draft.longitude.trim(), starts_at: new Date(`${draft.starts}-04:00`).toISOString(), ends_at: new Date(`${draft.ends}-04:00`).toISOString(), time_zone: "America/Manaus", service_seconds: Number(draft.service) };
}
export function cargoMatches(plan: ManualPlan, cargo: EligibleCargo | null, organizationId: string): boolean {
    const same = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);
    return !!cargo && Array.isArray(plan.fulfillment_ids) && Array.isArray(plan.deliveries) && cargo.organizationId === organizationId && cargo.warehouseId === plan.warehouse_id &&
        plan.fulfillment_ids.length > 0 && plan.fulfillment_ids.length <= 30 && same(plan.fulfillment_ids, cargo.fulfillmentIds) &&
        same(plan.deliveries.map(item => item.supplier_order_id), cargo.orderIds);
}
