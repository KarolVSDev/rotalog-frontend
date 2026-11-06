import { useEffect, useRef, useState } from "react";
import { PlanningRepository, routeDetailError } from "../api/planningRepository";
import { routeStates, type CanonicalRoute } from "../api/planningTypes";
import { dateOnly, dateTime, detailButton, detailCard, text } from "./planningPresentation";
import { RouteStops } from "./RouteStops";
import { RouteManifest } from "./RouteManifest";
import { RouteTracking } from "./RouteTracking";

export function RouteDetails({ id, repository, onClose }: { id: string; repository: PlanningRepository; onClose: () => void }) {
    const heading = useRef<HTMLHeadingElement>(null);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ attempt: number; data?: CanonicalRoute; error?: string } | null>(null);
    const current = result?.attempt === attempt ? result : null;
    useEffect(() => {
        heading.current?.focus();
    }, []);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void repository.detail(id, controller.signal).then(data => { if (active) setResult({ attempt, data }); })
            .catch(error => { if (active) setResult({ attempt, error: routeDetailError(error) }); });
        return () => { active = false; controller.abort(); };
    }, [id, repository, attempt]);
    const route = current?.data;
    const origin = route?.stops.find(stop => stop.kind === "PICKUP");
    return <div className="space-y-6">
        <button type="button" className={detailButton} onClick={onClose}>← Voltar à listagem</button>
        <header><h1 ref={heading} tabIndex={-1} className="break-words text-2xl font-semibold outline-none">Detalhes da rota</h1><p className="mt-1 text-sm text-slate-600">Informações da operação e manifesto de carga. Horários em America/Manaus.</p></header>
        {!current && <p role="status" className={detailCard}>Carregando detalhes da rota…</p>}
        {current?.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{current.error}</p><button type="button" className={`${detailButton} mt-4`} onClick={() => setAttempt(value => value + 1)}>Tentar carregar rota novamente</button></div>}
        {route && <>
            {route.is_synthetic && <p className="text-xs font-medium text-slate-600">SIMULAÇÃO — dados sintéticos da API</p>}
            <section className={detailCard} aria-labelledby="route-general-title">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="route-general-title" className="break-all text-xl font-bold">{route.code || route.id}</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">{routeStates[route.state as keyof typeof routeStates] ?? route.state}</span></div>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {[["Identificador da rota", route.id], ["Data programada", dateOnly(route.scheduled_date)], ["Motorista responsável (ID)", text(route.driver_id)], ["Veículo", route.vehicle?.registration || text(route.vehicle_id)], ["Origem da coleta", text(origin?.address_snapshot.address)], ["Depósito (ID)", text(route.warehouse_id)], ["Carga", route.cargo ? `${route.cargo.total_sellable_packages} volumes vendáveis` : "Não informada"], ["Início", dateTime(route.started_at)], ["Encerramento do deslocamento", dateTime(route.execution_ended_at)], ["Última atualização", dateTime(route.updated_at)], ["Versão da rota", String(route.version)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">{value}</dd></div>)}
                </dl>
            </section>
            <RouteStops stops={route.stops}/>
            <RouteManifest key={id} id={id} repository={repository}/>
            <RouteTracking key={`tracking:${id}`} route={route} repository={repository}/>
        </>}
    </div>;
}
