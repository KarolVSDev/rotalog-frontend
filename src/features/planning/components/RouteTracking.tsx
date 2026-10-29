import { useEffect, useState } from "react";
import { PlanningRepository, trackingError } from "../api/planningRepository";
import { routeStates, type CanonicalRoute, type RouteTracking as Tracking, type TrackingHistory, type TrackingPoint } from "../api/planningTypes";
import { chronologicalPoints, dateTime, detailButton, detailCard } from "./planningPresentation";

const trackingStates: Record<Tracking["state"], string> = {
    NOT_STARTED: "Não iniciado", ACTIVE: "Ativo", DEGRADED_OFFLINE: "Degradado: sem conexão",
    DEGRADED_PERMISSION: "Degradado: permissão de localização", STALE: "Posição desatualizada", ENDED: "Encerrado",
};
function Position({ point }: { point: TrackingPoint }) {
    return <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[["Latitude", point.latitude], ["Longitude", point.longitude], ["Precisão informada (metros)", point.accuracy_meters],
            ["Capturada no dispositivo", dateTime(point.captured_at_device)], ["Recebida pela API", dateTime(point.received_at_server)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}
        {point.is_mocked_by_os && <div className="sm:col-span-2 text-amber-900">O dispositivo sinalizou esta posição como simulada.</div>}
        {point.flags.length > 0 && <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-slate-600">Sinalizações da API</dt><dd className="mt-1 break-words">{point.flags.join(", ")}</dd></div>}
    </dl>;
}

export function RouteTracking({ route, repository }: { route: CanonicalRoute; repository: PlanningRepository }) {
    const [query, setQuery] = useState<{ epoch: number; cursor: string | null; retry: number }>({ epoch: 0, cursor: null, retry: 0 });
    const [current, setCurrent] = useState<{ epoch: number; data?: Tracking; error?: string } | null>(null);
    const [operation, setOperation] = useState<{ epoch: number; route?: CanonicalRoute; error?: string } | null>(null);
    const [history, setHistory] = useState<{ epoch: number; key: string; data?: TrackingHistory; points: TrackingPoint[]; error?: string } | null>(null);
    const { id } = route;
    const { epoch, cursor, retry } = query;
    const historyKey = JSON.stringify([cursor, retry]);
    const currentResult = current?.epoch === epoch ? current : null;
    const operationResult = operation?.epoch === epoch ? operation : null;
    const historyResult = history?.epoch === epoch ? history : null;
    const historyPending = historyResult?.key !== historyKey;
    const busy = !currentResult || !operationResult || historyPending;
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void repository.trackingCurrent(id, controller.signal).then(data => { if (active) setCurrent({ epoch, data }); })
            .catch(error => { if (active) setCurrent({ epoch, error: trackingError(error) }); });
        void repository.detail(id, controller.signal).then(route => { if (active) setOperation({ epoch, route }); })
            .catch(error => { if (active) setOperation({ epoch, error: trackingError(error) }); });
        return () => { active = false; controller.abort(); };
    }, [id, repository, epoch]);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void repository.trackingHistory(id, cursor, controller.signal).then(data => {
            if (active) setHistory(previous => ({ epoch, key: historyKey, data,
                points: chronologicalPoints([...(cursor && previous?.epoch === epoch ? previous.points : []), ...data.items]) }));
        }).catch(error => {
            if (active) setHistory(previous => ({ epoch, key: historyKey, data: previous?.epoch === epoch ? previous.data : undefined,
                points: previous?.epoch === epoch ? previous.points : [], error: trackingError(error) }));
        });
        return () => { active = false; controller.abort(); };
    }, [id, repository, epoch, cursor, historyKey]);
    const tracking = currentResult?.data;
    return <section className={detailCard} aria-labelledby="route-tracking-title">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 id="route-tracking-title" className="text-lg font-bold">Acompanhamento da rota</h2><button type="button" className={detailButton} disabled={busy} onClick={() => setQuery(value => ({ epoch: value.epoch + 1, cursor: null, retry: 0 }))}>Atualizar rastreamento</button></div>
        <p className="mt-2 text-sm leading-6 text-slate-600">Posições registradas pela API, consultadas ao abrir esta seção ou por atualização manual. Horários em America/Manaus.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold">Estado operacional da rota</h3>
                {!operationResult && <p role="status" className="mt-2 text-sm">Consultando estado operacional…</p>}
                {operationResult?.error && <p role="alert" className="mt-2 text-sm text-red-800">{operationResult.error}</p>}
                {operationResult?.route && <><p className="mt-2 font-semibold">{routeStates[operationResult.route.state as keyof typeof routeStates] ?? operationResult.route.state}</p><p className="mt-2 text-xs text-slate-600">Atualização da rota: {dateTime(operationResult.route.updated_at)}</p></>}
            </div>
            <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold">Estado do rastreamento</h3>
                {!currentResult && <p role="status" className="mt-2 text-sm">Consultando última posição…</p>}
                {currentResult?.error && <p role="alert" className="mt-2 text-sm text-red-800">{currentResult.error}</p>}
                {tracking && <><p className="mt-2 font-semibold">{trackingStates[tracking.state] ?? tracking.state}</p>{tracking.position && tracking.is_stale && <p className="mt-2 text-sm text-amber-900">A última posição está desatualizada segundo a API.</p>}</>}
            </div>
        </div>
        {tracking && <div className="mt-5"><h3 className="font-semibold">Última posição conhecida</h3>{tracking.position ? <div className="mt-3 rounded-xl border border-slate-200 p-4"><Position point={tracking.position}/></div> : <p className="mt-2 text-sm text-slate-600">Nenhuma localização registrada para esta rota.</p>}</div>}
        <div className="mt-6" aria-busy={historyPending}><h3 className="font-semibold">Histórico de posições</h3><p className="mt-1 text-xs text-slate-600">Pontos carregados em ordem de captura, do mais antigo ao mais recente. A API não informa o total do histórico.</p>
            {historyPending && <p role="status" className="mt-3 text-sm">Carregando histórico de posições…</p>}
            {!historyPending && historyResult?.error && <div role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{historyResult.error}</p><button type="button" className={`${detailButton} mt-3`} onClick={() => setQuery(value => ({ ...value, retry: value.retry + 1 }))}>Tentar histórico novamente</button></div>}
            {historyResult && <><p className="mt-3 text-xs text-slate-600">{historyResult.points.length} posição(ões) carregada(s)</p>
                {!historyPending && !historyResult.error && historyResult.points.length === 0 && <p className="mt-3 text-sm text-slate-600">Histórico sem posições registradas.</p>}
                <ol aria-label="Posições em ordem cronológica" className="mt-3 space-y-3">{historyResult.points.map((point, index) => <li key={point.id} className="min-w-0 rounded-xl border border-slate-200 p-4"><h4 className="mb-3 text-sm font-semibold">Posição {index + 1}</h4><Position point={point}/></li>)}</ol>
                {!historyPending && !historyResult.error && historyResult.data?.next_cursor && <button type="button" className={`${detailButton} mt-4`} onClick={() => setQuery(value => ({ ...value, cursor: historyResult.data!.next_cursor, retry: 0 }))}>Carregar mais posições</button>}
            </>}
        </div>
        {!busy && (currentResult?.error || operationResult?.error) && <p className="mt-4 text-sm text-slate-600">Use Atualizar rastreamento para tentar novamente. Os detalhes e o manifesto continuam disponíveis.</p>}
    </section>;
}
