import type { RouteStop } from "../api/planningTypes";
import { dateTime, detailCard, stopState, text } from "./planningPresentation";

export function RouteStops({ stops }: { stops: RouteStop[] }) {
    return <section className={detailCard} aria-labelledby="route-stops-title">
        <h2 id="route-stops-title" className="text-lg font-bold">Sequência de paradas</h2>
        <p className="mt-1 text-sm text-slate-600">Ordem informada pela rota. Horários em America/Manaus.</p>
        {!stops.length && <p className="mt-4 text-sm text-slate-600">Nenhuma parada informada.</p>}
        <ol className="mt-5 space-y-4" aria-label="Paradas em ordem">
            {[...stops].sort((a, b) => a.sequence - b.sequence).map(stop => <li key={stop.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3"><span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">Sequência {stop.sequence}</span><h3 className="font-semibold">{({ PICKUP: "Coleta", DELIVERY: "Entrega" } as Record<string, string>)[stop.kind] ?? stop.kind}</h3><span className="text-sm text-slate-600">{stopState(stop.state)}</span></div>
                <p className="mt-3 break-words text-sm font-medium">{text(stop.address_snapshot.address)}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    {stop.supplier_order_id && <div><dt className="text-xs text-slate-600">Pedido</dt><dd className="mt-1 break-all">{stop.supplier_order_id}</dd></div>}
                    {!!(stop.address_snapshot.starts_at || stop.address_snapshot.ends_at) && <div><dt className="text-xs text-slate-600">Janela de atendimento</dt><dd className="mt-1">{dateTime(typeof stop.address_snapshot.starts_at === "string" ? stop.address_snapshot.starts_at : null)} até {dateTime(typeof stop.address_snapshot.ends_at === "string" ? stop.address_snapshot.ends_at : null)}</dd></div>}
                    {[["recipient_name", "Recebedor"], ["contact_name", "Contato"], ["contact_phone", "Telefone"], ["reference", "Referência"], ["instructions", "Instruções"], ["service_seconds", "Tempo de atendimento (segundos)"]].map(([field, label]) => stop.address_snapshot[field] != null && <div key={field}><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words">{text(stop.address_snapshot[field])}</dd></div>)}
                    {stop.attempt_state && <div><dt className="text-xs text-slate-600">Tentativa de entrega</dt><dd className="mt-1">{stopState(stop.attempt_state)}</dd></div>}
                </dl>
            </li>)}
        </ol>
    </section>;
}
