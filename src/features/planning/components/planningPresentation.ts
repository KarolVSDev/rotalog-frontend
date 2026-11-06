export const detailCard = "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
export const detailButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
export function text(value: unknown): string {
    return typeof value === "string" && value.trim() ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "Não informado";
}
export function dateTime(value?: string | null): string {
    if (!value || !Number.isFinite(Date.parse(value))) return "Não informado";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Manaus" }).format(new Date(value));
}
export function dateOnly(value?: string | null): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Não informada";
    return value.split("-").reverse().join("/");
}
export function stopState(value: string): string {
    return ({ PENDING: "Pendente", COMPLETED: "Concluída", DELIVERY_IN_PROGRESS: "Entrega em andamento", STARTED: "Iniciada", PROOF_PENDING: "Comprovação pendente", CANCELLED: "Cancelada" } as Record<string, string>)[value] ?? value;
}
import type { TrackingPoint } from "../api/planningTypes";

export function chronologicalPoints(points: TrackingPoint[]): TrackingPoint[] {
    return [...new Map(points.map(point => [point.id, point])).values()].sort((a, b) =>
        Date.parse(a.captured_at_device) - Date.parse(b.captured_at_device) || a.id.localeCompare(b.id));
}
