import { useEffect, useRef, useState } from "react";
import { PlanningRepository, planError } from "../api/planningRepository";
import type { Driver, Vehicle, ManualPlan, RoutePlan } from "../api/planTypes";
import type { CanonicalRoute } from "../api/planningTypes";
import { detailButton, detailCard } from "./planningPresentation";
import { destinationPayload, emptyDestination, validateDraft, type DestinationDraft } from "./planValidation";
import { PlanWorkflow } from "./PlanWorkflow";

const input = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100";
export function PlanningWorkspace({ repository, organizationId, onClose, onPublished }: { repository: PlanningRepository; organizationId: string; onClose: () => void; onPublished: (route: CanonicalRoute) => void }) {
    const heading = useRef<HTMLHeadingElement>(null);
    const [attempt, setAttempt] = useState(0);
    const [fleet, setFleet] = useState<{ attempt: number; drivers?: Driver[]; vehicles?: Vehicle[]; error?: string } | null>(null);
    const [driver, setDriver] = useState(""); const [vehicle, setVehicle] = useState(""); const [reason, setReason] = useState("");
    const [destinations, setDestinations] = useState<(DestinationDraft & { key: number })[]>([{ ...emptyDestination(), key: 0 }]);
    const nextKey = useRef(1);
    const [error, setError] = useState(""); const [review, setReview] = useState<ManualPlan | null>(null);
    const [planId, setPlanId] = useState(""); const [plan, setPlan] = useState<RoutePlan | null>(null);
    const [reading, setReading] = useState(false); const [readError, setReadError] = useState("");
    const readLock = useRef(false); const mounted = useRef(true);
    useEffect(() => { mounted.current = true; heading.current?.focus(); return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        let active = true; const controller = new AbortController();
        void Promise.all([repository.drivers(controller.signal), repository.vehicles(controller.signal)]).then(([drivers, vehicles]) => {
            if (active) setFleet({ attempt, drivers, vehicles });
        }).catch(error => { if (active) setFleet({ attempt, error: planError(error) }); });
        return () => { active = false; controller.abort(); };
    }, [repository, attempt]);
    const current = fleet?.attempt === attempt ? fleet : null;
    function update(key: number, field: keyof DestinationDraft, value: string) {
        setDestinations(rows => rows.map(row => row.key === key ? { ...row, [field]: value } : row)); setReview(null);
    }
    function move(index: number, offset: number) {
        setDestinations(rows => { const next = [...rows]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; }); setReview(null);
    }
    async function readPlan() {
        if (readLock.current) return;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId.trim())) { setReadError("Informe um UUID válido de proposta."); return; }
        readLock.current = true; setReading(true); setReadError(""); setPlan(null);
        try { const result = await repository.plan(planId.trim()); if (mounted.current) setPlan(result); }
        catch (error) { if (mounted.current) setReadError(planError(error)); }
        finally { readLock.current = false; if (mounted.current) setReading(false); }
    }
    return <div className="space-y-6">
        <button type="button" className={detailButton} onClick={onClose}>← Voltar ao planejamento</button>
        <header><h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">Planejar nova rota</h1><p className="mt-2 text-sm text-slate-600">Prepare os destinos e revise a proposta. A coleta será a primeira parada, seguida das entregas na ordem definida.</p></header>
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Prévia de planejamento: a seleção de carga e os comandos de criação, aprovação e publicação estão bloqueados até existir uma consulta autorizada de lotes elegíveis. O isolamento por fornecedor ainda não foi implementado no backend.</p>
        <form className="space-y-6" onSubmit={event => {
            event.preventDefault(); setError("");
            try {
                validateDraft(driver, vehicle, reason, destinations);
                if (!current?.drivers?.some(item => item.id === driver) || !current?.vehicles?.some(item => item.id === vehicle)) throw new Error("Atualize a frota e selecione recursos disponíveis na consulta.");
                setReview({ warehouse_id: "", fulfillment_ids: [], driver_id: driver, vehicle_id: vehicle, reason: reason.trim(), deliveries: destinations.map(row => destinationPayload(row, "")) });
            } catch (failure) { setReview(null); setError(failure instanceof Error ? failure.message : "Revise os campos."); }
        }}>
            <section className={detailCard} aria-labelledby="cargo-selection-title"><h2 id="cargo-selection-title" className="text-lg font-bold">Origem e carga</h2><p id="cargo-blocked-help" className="mt-2 text-sm text-slate-600">Aguardando integração de lotes elegíveis. Nenhum pedido ou lote pode ser informado manualmente.</p><fieldset disabled aria-describedby="cargo-blocked-help" className="mt-4 grid gap-4 sm:grid-cols-2"><legend className="sr-only">Seleção de carga indisponível</legend><div><label htmlFor="plan-origin" className="text-sm font-semibold">Origem/depósito</label><select id="plan-origin" className={input}><option>Aguardando origens autorizadas</option></select></div><div><label htmlFor="plan-loads" className="text-sm font-semibold">Lotes elegíveis</label><select id="plan-loads" className={input}><option>Seleção indisponível</option></select></div></fieldset></section>
            <section className={detailCard} aria-labelledby="fleet-title"><h2 id="fleet-title" className="text-lg font-bold">Motorista e veículo</h2><p className="mt-2 text-sm text-slate-600">Recursos retornados pela API atual. A lista não comprova disponibilidade ou autorização por fornecedor.</p>
                {!current && <p role="status" className="mt-4 text-sm">Consultando motoristas e veículos…</p>}
                {current?.error && <div role="alert" className="mt-4 text-sm text-red-800"><p>{current.error}</p><button type="button" className={`${detailButton} mt-3`} onClick={() => setAttempt(value => value + 1)}>Tentar consultar frota novamente</button></div>}
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label htmlFor="plan-driver" className="text-sm font-semibold">Motorista</label><select id="plan-driver" className={input} value={driver} disabled={!current?.drivers} onChange={event => { setDriver(event.target.value); setReview(null); }}><option value="">Selecione um motorista</option>{current?.drivers?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{current?.drivers?.length === 0 && <p className="mt-2 text-sm">Nenhum motorista retornado pela API.</p>}</div><div><label htmlFor="plan-vehicle" className="text-sm font-semibold">Veículo</label><select id="plan-vehicle" className={input} value={vehicle} disabled={!current?.vehicles} onChange={event => { setVehicle(event.target.value); setReview(null); }}><option value="">Selecione um veículo</option>{current?.vehicles?.map(item => <option key={item.id} value={item.id}>{item.registration}</option>)}</select>{current?.vehicles?.length === 0 && <p className="mt-2 text-sm">Nenhum veículo retornado pela API.</p>}</div></div>
                {current?.vehicles?.filter(item => item.id === vehicle).map(item => <p key={item.id} className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Capacidade: {item.package_units} volumes vendáveis · {item.weight_grams} g · {item.volume_cm3} cm³</p>)}
            </section>
            <section className={detailCard} aria-labelledby="destinations-title"><h2 id="destinations-title" className="text-lg font-bold">Destinos e sequência das entregas</h2><p className="mt-2 text-sm text-slate-600">Preenchimento para revisão visual, ainda sem vínculo com pedidos. Horários em America/Manaus (UTC−04:00). Não há cálculo de tempo de viagem.</p>
                <ol className="mt-5 space-y-5">{destinations.map((row, index) => <li key={row.key} className="min-w-0 rounded-xl border border-slate-200 p-4"><fieldset><legend className="font-semibold">Entrega {index + 1}</legend><div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">{([
                    ["address", "Endereço", "text"], ["latitude", "Latitude", "text"], ["longitude", "Longitude", "text"], ["starts", "Início da janela", "datetime-local"], ["ends", "Fim da janela", "datetime-local"], ["service", "Atendimento (segundos)", "text"],
                ] as const).map(([field, label, type]) => <div key={field} className="min-w-0"><label htmlFor={`destination-${row.key}-${field}`} className="text-sm font-medium">{label}</label><input id={`destination-${row.key}-${field}`} className={input} type={type} value={row[field]} maxLength={field === "address" ? 500 : 40} onChange={event => update(row.key, field, event.target.value)}/></div>)}</div></fieldset><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={detailButton} disabled={index === 0} aria-label={`Mover entrega ${index + 1} para cima`} onClick={() => move(index, -1)}>Subir</button><button type="button" className={detailButton} disabled={index === destinations.length - 1} aria-label={`Mover entrega ${index + 1} para baixo`} onClick={() => move(index, 1)}>Descer</button><button type="button" className={detailButton} disabled={destinations.length === 1} aria-label={`Remover entrega ${index + 1}`} onClick={() => { setDestinations(rows => rows.filter(item => item.key !== row.key)); setReview(null); }}>Remover</button></div></li>)}</ol>
                <button type="button" className={`${detailButton} mt-4`} disabled={destinations.length >= 30} onClick={() => { setDestinations(rows => [...rows, { ...emptyDestination(), key: nextKey.current++ }]); setReview(null); }}>Adicionar entrega</button>
            </section>
            <section className={detailCard}><label htmlFor="plan-reason" className="font-semibold">Justificativa</label><textarea id="plan-reason" className={input} rows={3} maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setReview(null); }}/><p className="mt-2 text-xs text-slate-600">De 5 a 500 caracteres.</p></section>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            <button type="submit" className={detailButton}>Revisar preenchimento</button>
        </form>
        {review && <PlanWorkflow key={JSON.stringify(review)} repository={repository} organizationId={organizationId} draft={review} eligibility={null} onPublished={onPublished}/>}
        <section className={detailCard} aria-labelledby="existing-plan-title"><h2 id="existing-plan-title" className="text-lg font-bold">Consultar proposta existente</h2><p className="mt-2 text-sm text-slate-600">Consulte pelo identificador retornado pela API. Esta consulta não libera comandos sem carga validada.</p><form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void readPlan(); }}><div className="min-w-0 flex-1"><label htmlFor="existing-plan-id" className="text-sm font-medium">Identificador da proposta</label><input id="existing-plan-id" value={planId} onChange={event => setPlanId(event.target.value)} className={input} maxLength={36}/></div><button type="submit" className={detailButton} disabled={reading}>Consultar proposta</button></form>{reading && <p role="status" className="mt-3">Consultando proposta…</p>}{readError && <p role="alert" className="mt-3 text-sm text-red-800">{readError}</p>}</section>
        {plan && <PlanWorkflow key={`${plan.id}:${plan.version}`} initialPlan={plan} repository={repository} organizationId={organizationId} eligibility={null} onPublished={onPublished}/>}
    </div>;
}
