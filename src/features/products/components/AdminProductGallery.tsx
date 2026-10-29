import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { adminAuthorized } from "../../services/apiAuth.service";
import { AuthenticatedProductImage } from "../../../shared/components/AuthenticatedProductImage";
import { ProductImagesRepository, imageOperationError, type ImageJob, type ProductGallery } from "../api/productImagesRepository";
import { CanonicalImageSelection } from "./CanonicalImageSelection";

const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-700";
export function AdminProductGallery({ productId, initialJobs = [], snapshot, disabled = false, onGallery, onBusy }: {
    productId: string; initialJobs?: ImageJob[]; snapshot?: ProductGallery | null; disabled?: boolean;
    onGallery?: (gallery: ProductGallery) => void; onBusy?: (busy: boolean) => void;
}) {
    const { user } = useAuth();
    const allowed = !!user && adminAuthorized(user, "product:write");
    const repository = useMemo(() => new ProductImagesRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const [result, setResult] = useState<ProductGallery | null>(null); const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0); const [busy, setBusy] = useState(false); const [checking, setChecking] = useState(false);
    const [jobs, setJobs] = useState(initialJobs); const [phase, setPhase] = useState("");
    const [removeId, setRemoveId] = useState<string | null>(null);
    const lock = useRef(false); const controller = useRef<AbortController | null>(null); const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
    useEffect(() => {
        if (!allowed) return;
        const abort = new AbortController(); let active = true;
        void repository.gallery(productId, abort.signal).then(gallery => { if (active) { setResult(gallery); setError(""); } }).catch(error => { if (active) setError(imageOperationError(error)); });
        return () => { active = false; abort.abort(); };
    }, [repository, productId, attempt, allowed]);
    const gallery = snapshot?.product_id === productId && (!result || snapshot.product_version >= result.product_version) ? snapshot : result;
    if (!allowed) return null;
    async function run(action: (abort: AbortSignal) => Promise<ProductGallery>) {
        if (lock.current || disabled || checking) return;
        lock.current = true; setBusy(true); onBusy?.(true); setError("");
        const abort = new AbortController(); controller.current = abort;
        try {
            const value = await action(abort.signal);
            if (mounted.current) { setResult(value); onGallery?.(value); setRemoveId(null); setPhase(""); }
        } catch (failure) {
            if (!mounted.current) return;
            setError(imageOperationError(failure));
            try { const latest = await repository.gallery(productId, abort.signal); if (mounted.current) { setResult(latest); onGallery?.(latest); } } catch { /* Keep the last confirmed gallery and original error. */ }
        } finally { lock.current = false; if (mounted.current) { setBusy(false); onBusy?.(false); } }
    }
    return <section aria-labelledby="admin-gallery-title" className="mt-6 min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="admin-gallery-title" className="text-lg font-bold">Galeria do produto</h2><button type="button" className={button} disabled={busy || disabled} onClick={() => setAttempt(value => value + 1)}>Atualizar galeria</button></div>
        <p className="text-xs leading-5 text-slate-600">Alterações somente na galeria canônica. Remover uma associação não apaga o arquivo físico. Não feche esta tela durante um envio; as tentativas ficam somente nesta sessão da tela.</p>
        {!gallery && !error && <p role="status" className="text-sm">Carregando galeria…</p>}
        {gallery && <><p className="text-sm text-slate-600">{gallery.images.length} imagem(ns) · Versão do produto {gallery.product_version} · Limite definido pela API (cinco por padrão).</p>
            {!gallery.images.length && <p className="text-sm text-slate-600">Este produto ainda não possui imagens associadas.</p>}
            <ul className="grid gap-4 sm:grid-cols-2">{gallery.images.map((image, index) => <li key={image.id} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3"><AuthenticatedProductImage lazy={false} productId={productId} image={image} name="produto" className="h-32 w-full"/><p className="break-words text-sm">{image.alt_text || "Imagem do produto"} · {image.is_primary ? "Principal" : `Posição ${index + 1}`}</p><div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={busy || disabled || image.is_primary} onClick={() => void run(signal => repository.mutate(productId, gallery, "primary", image.id, signal))}>Definir principal</button><button className={button} type="button" aria-label={`Mover imagem ${index + 1} para cima`} disabled={busy || disabled || index === 0} onClick={() => {
                const ids = gallery.images.map(item => item.id); [ids[index], ids[index - 1]] = [ids[index - 1], ids[index]];
                void run(signal => repository.mutate(productId, gallery, "reorder", ids, signal));
            }}>Subir</button><button className={button} type="button" aria-label={`Mover imagem ${index + 1} para baixo`} disabled={busy || disabled || index === gallery.images.length - 1} onClick={() => {
                const ids = gallery.images.map(item => item.id); [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                void run(signal => repository.mutate(productId, gallery, "reorder", ids, signal));
            }}>Descer</button><button className={button} type="button" disabled={busy || disabled} aria-label={`Remover imagem ${index + 1}`} onClick={() => setRemoveId(image.id)}>Remover associação</button></div></li>)}</ul>
        </>}
        {removeId && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>Confirma remover esta associação? O produto e o arquivo físico serão preservados.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={busy || disabled || !gallery} onClick={() => gallery && void run(signal => repository.mutate(productId, gallery, "remove", removeId, signal))}>Confirmar remoção</button><button type="button" className={button} disabled={busy} onClick={() => setRemoveId(null)}>Cancelar remoção</button></div></div>}
        <CanonicalImageSelection jobs={jobs.filter(job => !job.attached)} onChange={selected => setJobs([...jobs.filter(job => job.attached), ...selected])} disabled={busy || disabled} onChecking={setChecking}/>
        <button type="button" className={button} disabled={busy || disabled || checking || !gallery || !jobs.some(job => !job.attached)} onClick={() => void run(async signal => {
            let latest = gallery!;
            for (const job of jobs.filter(item => !item.attached)) latest = await repository.resume(productId, job, signal, value => { if (mounted.current) setPhase(value); });
            return latest;
        })}>Enviar ou retomar imagens selecionadas</button>
        {(busy || phase) && <p role="status" className="text-sm text-slate-600">{phase || "Atualizando galeria…"}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} O produto foi preservado. Atualize ou retome a tentativa; não cadastre outro produto para repetir o envio.</p>}
    </section>;
}
