import { useEffect, useState } from "react";
import { PlanningRepository, routeDetailError } from "../api/planningRepository";
import type { CargoManifest } from "../api/planningTypes";
import { dateTime, detailButton, detailCard, text } from "./planningPresentation";

export function RouteManifest({ id, repository }: { id: string; repository: PlanningRepository }) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ attempt: number; data?: CargoManifest; error?: string } | null>(null);
    const current = result?.attempt === attempt ? result : null;
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void repository.manifest(id, controller.signal).then(data => { if (active) setResult({ attempt, data }); })
            .catch(error => { if (active) setResult({ attempt, error: routeDetailError(error, true) }); });
        return () => { active = false; controller.abort(); };
    }, [id, repository, attempt]);
    const data = current?.data;
    return <section className={detailCard} aria-labelledby="route-manifest-title" aria-busy={!current}>
        <h2 id="route-manifest-title" className="text-lg font-bold">Manifesto de carga</h2>
        {!current && <p role="status" className="mt-4 text-sm text-slate-600">Carregando manifesto…</p>}
        {current?.error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{current.error}</p><button className={`${detailButton} mt-3`} type="button" onClick={() => setAttempt(value => value + 1)}>Tentar carregar manifesto novamente</button></div>}
        {data && <div className="mt-4 space-y-5">
            {data.requires_replanning && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Replanejamento necessário: a carga mudou em relação ao plano aprovado.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-600">Conferência</p><p className="mt-1 text-sm font-semibold">{data.declaration_valid ? "Conferência válida" : data.checked_at ? "Conferência sem validade atual" : "Carga ainda não conferida"}</p><p className="mt-2 text-xs text-slate-600">Conferida em: {dateTime(data.checked_at)}</p><p className="mt-1 text-xs text-slate-600">Carga recebida em: {dateTime(data.received_at)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-600">Pendências não resolvidas</p><p className="mt-1 text-xl font-bold">{data.unresolved_issues}</p><p className="mt-2 text-sm text-slate-600">{data.unresolved_issues === 0 ? "Nenhuma ocorrência aberta registrada. Isso não substitui a conferência da carga." : "Existem divergências pendentes de resolução."}</p></div>
            </div>
            <p className="text-sm font-semibold">{data.total_sellable_packages} volumes vendáveis · Versão do manifesto {data.manifest_version}</p>
            <ul aria-label="Linhas do manifesto" className="grid gap-3 md:grid-cols-2">
                {data.lines.map(line => <li key={line.id} className="min-w-0 rounded-xl border border-slate-200 p-4"><h3 className="break-words font-semibold">{line.product_name}</h3><p className="mt-1 break-words text-sm text-slate-600">Marca: {text(line.brand)} · Embalagem: {text(line.packaging_type)}</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Quantidade prevista</dt><dd className="mt-1 font-semibold">{line.expected_quantity} volumes vendáveis</dd></div><div><dt className="text-xs text-slate-600">Quantidade despachada</dt><dd className="mt-1 font-semibold">{line.dispatched_quantity} volumes vendáveis</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-600">Linha do lote</dt><dd className="mt-1 break-all">{line.fulfillment_line_id}</dd></div></dl></li>)}
            </ul>
            {!data.lines.length && <p className="text-sm text-slate-600">Nenhuma linha de carga informada.</p>}
            <div><h3 className="font-semibold">Ocorrências e divergências</h3>
                {!data.issues.length && <p className="mt-2 text-sm text-slate-600">Nenhuma ocorrência registrada.</p>}
                <ul className="mt-3 space-y-3" aria-label="Ocorrências da carga">{data.issues.map(issue => <li key={issue.id} className="min-w-0 rounded-xl border border-slate-200 p-4 text-sm">
                    <p className="font-semibold">{({ MISSING: "Falta", EXCESS: "Sobra", DAMAGED: "Avaria", WRONG_PRODUCT: "Produto incorreto", OTHER: "Outra ocorrência" } as Record<string, string>)[issue.category] ?? issue.category} · {issue.state === "OPEN" ? "Pendente" : "Resolvida"}</p>
                    <p className="mt-2 break-words">{issue.reason}</p><p className="mt-2 text-slate-600">Previsto: {issue.expected_quantity} · Encontrado: {issue.observed_quantity}</p><p className="mt-2 break-all text-xs text-slate-600">Linha do lote: {issue.fulfillment_line_id}</p><p className="mt-2 text-xs text-slate-600">Registrada em: {dateTime(issue.created_at)}</p>
                    {issue.correction && <p className="mt-2 break-words">Correção: {issue.correction}</p>}{issue.resolved_at && <p className="mt-2 text-xs text-slate-600">Resolvida em: {dateTime(issue.resolved_at)}</p>}
                </li>)}</ul>
            </div>
        </div>}
    </section>;
}
