import { useEffect, useRef, useState } from "react";
import { prepareImage, type ImageJob } from "../api/productImagesRepository";
function Preview({ job }: { job: ImageJob }) {
    const image = useRef<HTMLImageElement>(null);
    useEffect(() => { const value = URL.createObjectURL(job.file); const element = image.current; if (element) element.src = value; return () => { element?.removeAttribute("src"); URL.revokeObjectURL(value); }; }, [job.file]);
    return <img ref={image} alt={`Prévia de ${job.file.name}`} className="h-24 w-full rounded-lg object-contain"/>;
}
export function CanonicalImageSelection({ jobs, onChange, disabled = false, onChecking }: { jobs: ImageJob[]; onChange: (jobs: ImageJob[]) => void; disabled?: boolean; onChecking?: (busy: boolean) => void }) {
    const [checking, setChecking] = useState(false); const [error, setError] = useState("");
    const mounted = useRef(true); const lock = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    return <fieldset disabled={disabled || checking} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold">Imagens opcionais</legend>
        <p id="canonical-image-help" className="text-xs leading-5 text-slate-600">PNG/JPEG estáticos, até 8 MiB e 16 megapixels. Até cinco seleções nesta tela; o limite efetivo da galeria é validado pelo backend. Imagens não são obrigatórias.</p>
        <label className="block text-sm font-medium">Selecionar imagens<input type="file" multiple accept="image/png,image/jpeg" aria-describedby="canonical-image-help" className="mt-2 block w-full min-w-0 text-sm" onChange={event => {
            const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = "";
            if (lock.current || !files.length) return;
            if (jobs.length + files.length > 5) { setError("Selecione no máximo cinco imagens por vez."); return; }
            lock.current = true; setChecking(true); onChecking?.(true); setError("");
            void Promise.all(files.map(prepareImage)).then(selected => {
                if (mounted.current) {
                    const unique = selected.filter((job, index) => !jobs.some(old => old.sha256 === job.sha256) && selected.findIndex(other => other.sha256 === job.sha256) === index);
                    onChange([...jobs, ...unique]);
                }
            }).catch(error => { if (mounted.current) setError(error instanceof Error ? error.message : "Imagem inválida."); })
                .finally(() => { lock.current = false; if (mounted.current) { setChecking(false); onChecking?.(false); } });
        }}/></label>
        {checking && <p role="status" className="text-sm">Validando imagens e calculando SHA-256…</p>}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">{jobs.map(job => <li key={job.id} className="min-w-0 rounded-lg border border-slate-200 p-3"><Preview job={job}/><p className="mt-2 break-words text-xs">{job.file.name}</p><p className="mt-1 text-xs text-slate-600">{job.phase}</p><button type="button" className="mt-2 min-h-10 text-sm font-semibold text-red-800" aria-label={`Remover seleção ${job.file.name}`} onClick={() => onChange(jobs.filter(item => item.id !== job.id))}>Remover seleção</button></li>)}</ul>
    </fieldset>;
}
