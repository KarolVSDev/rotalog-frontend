import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { plannerAuthorized } from "../../services/apiAuth.service";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PlanningRepository, planningError } from "../api/planningRepository";
import { routeStates, type RouteFilters, type RoutesPage } from "../api/planningTypes";
import { RouteDetails } from "../components/RouteDetails";
import { PlanningWorkspace } from "../components/PlanningWorkspace";

const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50";
const select = "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const number = new Intl.NumberFormat("pt-BR");
function scheduledDate(value?: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Não informada";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

export function PlanningDashboard() {
    const { user } = useAuth();
    const authorized = !!user && plannerAuthorized(user);
    const repository = useMemo(() => new PlanningRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const [query, setQuery] = useState<RouteFilters & { page: number }>({ page: 1, state: "", active: "" });
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [planning, setPlanning] = useState(false);
    const planTrigger = useRef<HTMLButtonElement | null>(null);
    const detailsTrigger = useRef<HTMLButtonElement | null>(null);
    const [result, setResult] = useState<{ key: string; data?: RoutesPage; error?: string } | null>(null);
    const key = JSON.stringify([user?.id, user?.organization_id, query, attempt]);
    const current = result?.key === key ? result : null;
    const data = current?.data;
    const error = current?.error;
    const loading = !current;
    useEffect(() => {
        if (!authorized) return;
        let active = true;
        const controller = new AbortController();
        void repository.list(query.page, query, controller.signal)
            .then(data => { if (active) setResult({ key, data }); })
            .catch(error => { if (active) setResult({ key, error: planningError(error) }); });
        return () => { active = false; controller.abort(); };
    }, [repository, query, key, authorized]);

    if (!authorized) return <p role="alert">Acesso não autorizado para planejamento.</p>;
    const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
    return <><div hidden={selected !== null || planning} className="space-y-6">
        <PageHeader title="Planejamento" subtitle="Consulte as rotas da operação e acompanhe sua organização para coleta e entrega." actions={<button type="button" className={button} disabled={loading} onClick={() => setAttempt(value => value + 1)}>Atualizar rotas</button>}/>
        <div><button type="button" ref={planTrigger} className={button} onClick={() => setPlanning(true)}>Planejar nova rota</button></div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="planning-filters-title">
            <h2 id="planning-filters-title" className="text-lg font-bold">Consulta de rotas</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Selecione os filtros para consultar as rotas canônicas publicadas.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div><label className="text-sm font-semibold" htmlFor="planning-state">Estado operacional</label><select id="planning-state" className={select} value={query.state} onChange={event => setQuery(value => ({ ...value, page: 1, state: event.target.value as RouteFilters["state"] }))}>
                    <option value="">Todos os estados</option>{Object.entries(routeStates).map(([state, label]) => <option key={state} value={state}>{label}</option>)}
                </select></div>
                <div><label className="text-sm font-semibold" htmlFor="planning-active">Atividade</label><select id="planning-active" className={select} value={query.active} onChange={event => setQuery(value => ({ ...value, page: 1, active: event.target.value as RouteFilters["active"] }))}>
                    <option value="">Todas as rotas</option><option value="true">Ativas</option><option value="false">Encerradas ou canceladas</option>
                </select></div>
                <button type="button" className={button} onClick={() => setQuery({ page: 1, state: "", active: "" })}>Limpar filtros</button>
            </div>
        </section>
        <section aria-label="Resultado da consulta" aria-busy={loading} className="space-y-4">
            {loading && <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Consultando rotas…</p>}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><button type="button" className={`${button} mt-4`} onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>}
            {data && <>
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center">
                    <div><p className="text-sm font-semibold text-blue-900">Rotas encontradas</p><p className="mt-1 text-3xl font-bold text-blue-950">{number.format(data.total)}</p><p className="mt-1 text-xs text-blue-900">Total informado pela API para os filtros selecionados.</p></div>
                    <p className="text-sm text-blue-900" role="status">{data.items.length} rota(s) nesta página · Página {data.page} de {pages}</p>
                </div>
                {data.is_synthetic && <p className="text-xs font-medium text-slate-600">SIMULAÇÃO — dados sintéticos da API</p>}
                {!data.items.length && <div role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><h2 className="text-lg font-bold">Nenhuma rota encontrada</h2><p className="mt-2 text-sm text-slate-600">Não há rotas nesta página para os filtros selecionados. Revise os filtros ou atualize a consulta.</p></div>}
                <ul aria-label="Rotas encontradas" className="grid gap-4 lg:grid-cols-2">
                    {data.items.map(route => <li key={route.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-all text-base font-bold">{route.code || route.id}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">{routeStates[route.state as keyof typeof routeStates] ?? route.state}</span></div>
                        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 min-[400px]:grid-cols-2">
                            {[["Data programada", scheduledDate(route.scheduled_date)], ["Veículo", route.vehicle?.registration || "Não informado"], ["Carga", route.cargo ? `${number.format(route.cargo.total_sellable_packages)} volumes vendáveis` : "Não informada"], ["Paradas", Array.isArray(route.stops) ? `${route.stops.length} (coleta e entregas)` : "Não informadas"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}
                        </dl>
                        <button type="button" className={`${button} mt-5 w-full sm:w-auto`} onClick={event => { detailsTrigger.current = event.currentTarget; setSelected(route.id); }} aria-label={`Ver detalhes da rota ${route.code || route.id}`}>Ver detalhes</button>
                    </li>)}
                </ul>
                <nav aria-label="Paginação de rotas" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-600">Página {data.page} de {pages}</p><div className="flex gap-2"><button type="button" className={button} disabled={data.page <= 1} onClick={() => setQuery(value => ({ ...value, page: value.page - 1 }))}>Anterior</button><button type="button" className={button} disabled={data.page >= pages} onClick={() => setQuery(value => ({ ...value, page: value.page + 1 }))}>Próxima</button></div>
                </nav>
            </>}
        </section>
    </div>{planning && <PlanningWorkspace key={`${user?.id}:${user?.organization_id}`} repository={repository} organizationId={user?.organization_id ?? ""} onClose={() => { setPlanning(false); requestAnimationFrame(() => planTrigger.current?.focus()); }} onPublished={route => { setAttempt(value => value + 1); setPlanning(false); setSelected(route.id); detailsTrigger.current = planTrigger.current; }}/>} {selected && <RouteDetails key={`${user?.id}:${user?.organization_id}:${selected}`} id={selected} repository={repository} onClose={() => { setSelected(null); requestAnimationFrame(() => detailsTrigger.current?.focus()); }}/>}</>;
}
