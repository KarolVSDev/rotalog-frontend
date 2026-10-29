import { useRef, useState } from "react";
import { PlanningRepository, planError } from "../api/planningRepository";
import type { EligibleCargo, ManualPlan, RoutePlan } from "../api/planTypes";
import type { CanonicalRoute } from "../api/planningTypes";
import { cargoMatches } from "./planValidation";
import { dateTime, detailButton, detailCard, text } from "./planningPresentation";

export function PlanWorkflow({ repository, organizationId, draft, eligibility, initialPlan, onPublished }: {
    repository: PlanningRepository; organizationId: string; draft?: ManualPlan; eligibility: EligibleCargo | null;
    initialPlan?: RoutePlan; onPublished: (route: CanonicalRoute) => void;
}) {
    const [plan, setPlan] = useState(initialPlan);
    const [published, setPublished] = useState<CanonicalRoute | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    const lock = useRef(false);
    const attempts = useRef(new Map<string, string>());
    const snapshot = plan?.snapshot ?? draft;
    const allowed = !!snapshot && cargoMatches(snapshot as ManualPlan, eligibility, organizationId);
    async function command(action: "create" | "approve" | "publish" | "read") {
        if (lock.current || (action !== "read" && !allowed)) return;
        lock.current = true; setPending(true); setError("");
        const fingerprint = JSON.stringify([action, plan?.id, plan?.version, action === "create" ? draft : null]);
        let key = attempts.current.get(fingerprint);
        if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
        try {
            if (action === "read" && plan) { setPlan(await repository.plan(plan.id)); setUncertain(false); }
            else if (action === "create" && draft) { setPlan(await repository.createPlan(draft, key)); setUncertain(false); }
            else if (action === "approve" && plan) { setPlan(await repository.approvePlan(plan.id, plan.version, key)); setUncertain(false); }
            else if (action === "publish" && plan) { const route = await repository.publishPlan(plan.id, plan.version, key); setPublished(route); setUncertain(false); onPublished(route); }
        } catch (failure) { setError(planError(failure)); setUncertain(true); }
        finally { lock.current = false; setPending(false); }
    }
    return <section className={detailCard} aria-labelledby="plan-review-title">
        <h2 id="plan-review-title" className="text-lg font-bold">Revisão da proposta</h2>
        {!allowed && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Criação, aprovação e publicação bloqueadas: a consulta autorizada de lotes elegíveis ainda não está integrada. O isolamento por fornecedor permanece pendente no backend.</p>}
        <p className="mt-3 text-xs text-slate-600">A proposta não pode ser editada após criada. Tentativas em andamento ficam somente nesta tela; não recarregue durante uma operação com resultado incerto.</p>
        {snapshot && <><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[["Proposta", plan?.id ?? "Ainda não criada"], ["Estado", plan ? ({ PROPOSED: "Proposta", APPROVED: "Aprovada", PUBLISHED: "Publicada" } as Record<string, string>)[plan.state] ?? plan.state : "Revisão local"], ["Versão", plan ? String(plan.version) : "Não disponível"], ["Origem (ID)", text(snapshot.warehouse_id)], ["Motorista (ID)", text(snapshot.driver_id)], ["Veículo (ID)", text(snapshot.vehicle_id)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-all font-semibold">{value}</dd></div>)}</dl>
            <p className="mt-4 break-words text-sm">Justificativa: {plan?.reason ?? draft?.reason}</p>
            <p className="mt-3 text-sm">Lotes: {snapshot.fulfillment_ids?.length ?? 0}</p>
            <ol className="mt-4 space-y-3" aria-label="Entregas da proposta">{snapshot.deliveries?.map((stop, index) => <li key={`${stop.supplier_order_id}:${index}`} className="min-w-0 rounded-xl border border-slate-200 p-4 text-sm"><h3 className="font-semibold">Entrega {index + 1}</h3><p className="mt-2 break-words">{stop.address}</p><p className="mt-1 break-all">Pedido: {stop.supplier_order_id || "Aguardando seleção de carga"}</p><p className="mt-1">{stop.latitude}, {stop.longitude}</p><p className="mt-1">{dateTime(stop.starts_at)} até {dateTime(stop.ends_at)} · America/Manaus</p><p className="mt-1">Atendimento: {stop.service_seconds} segundos</p></li>)}</ol></>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {pending && <p role="status" className="mt-4 text-sm">Processando solicitação…</p>}
        <div className="mt-5 flex flex-wrap gap-3">
            {!plan && <button className={detailButton} type="button" disabled={!allowed || pending} onClick={() => void command("create")}>{uncertain ? "Repetir tentativa de criação" : "Criar proposta"}</button>}
            {plan && <button className={detailButton} type="button" disabled={pending} onClick={() => void command("read")}>Consultar proposta novamente</button>}
            {plan?.state === "PROPOSED" && <button className={detailButton} type="button" disabled={!allowed || pending} onClick={() => void command("approve")}>{uncertain ? "Repetir tentativa de aprovação" : "Aprovar proposta"}</button>}
            {plan?.state === "APPROVED" && !published && <button className={detailButton} type="button" disabled={!allowed || pending} onClick={() => void command("publish")}>{uncertain ? "Repetir tentativa de publicação" : "Publicar para o motorista"}</button>}
        </div>
        {published && <div role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-900"><p>Rota publicada: {published.code || published.id}</p><button className={`${detailButton} mt-3`} type="button" onClick={() => onPublished(published)}>Abrir detalhes da rota publicada</button></div>}
    </section>;
}
