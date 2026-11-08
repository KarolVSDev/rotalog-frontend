import { useEffect, useId, useRef, useState } from "react";
import { prepareImage, type ImageJob } from "../api/productImagesRepository";

function Preview({ job }: { job: ImageJob }) {
    const image = useRef<HTMLImageElement>(null);
    useEffect(() => { const value = URL.createObjectURL(job.file); const element = image.current; if (element) element.src = value; return () => { element?.removeAttribute("src"); URL.revokeObjectURL(value); }; }, [job.file]);
    return <img ref={image} alt={`Prévia de ${job.file.name}`} className="h-28 w-full rounded-lg bg-slate-50 object-contain"/>;
}

export function CanonicalImageSelection({ jobs, onChange, disabled = false, onChecking }: { jobs: ImageJob[]; onChange: (jobs: ImageJob[]) => void; disabled?: boolean; onChecking?: (busy: boolean) => void }) {
    const [checking, setChecking] = useState(false); const [error, setError] = useState("");
    const mounted = useRef(true); const lock = useRef(false);
    const inputId = useId();
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    return <fieldset disabled={disabled || checking} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <legend className="px-1 text-sm font-bold text-slate-900">Imagens do produto</legend>
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p id={`${inputId}-help`} className="text-xs leading-5 text-slate-600">PNG ou JPEG · até 8 MiB e 16 MP por imagem</p>
                <span aria-live="polite" className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{jobs.length} de 5 selecionadas</span>
            </div>
            <label htmlFor={inputId} className="group inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>
                </svg>
                Selecionar imagens
                <input id={inputId} type="file" multiple accept="image/png,image/jpeg" aria-describedby={`${inputId}-help`} className="sr-only" onChange={event => {
            const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = "";
            if (lock.current || !files.length) return;
            if (jobs.length + files.length > 5) { setError("Selecione no máximo cinco imagens por vez."); return; }
            lock.current = true; setChecking(true); onChecking?.(true); setError("");
            void Promise.all(files.map(prepareImage)).then(selected => {
                if (mounted.current) {
                    const unique = selected.filter((job, index) => !jobs.some(old => old.sha256 === job.sha256) && selected.findIndex(other => other.sha256 === job.sha256) === index);
                    onChange([...jobs, ...unique]);
                }
            })                .catch(error => { if (mounted.current) setError(error instanceof Error ? error.message : "Imagem inválida."); })
                .finally(() => { lock.current = false; if (mounted.current) { setChecking(false); onChecking?.(false); } });
                }}/>
            </label>
            {checking && <p role="status" className="text-sm text-slate-600">Validando imagens…</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            {jobs.length > 0 && <ul aria-label="Imagens selecionadas" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {jobs.map(job => <li key={job.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5">
                <Preview job={job}/>
                <p className="mt-2 truncate text-xs font-medium text-slate-800" title={job.file.name}>{job.file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{job.phase}</p>
                <button type="button" className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700" aria-label={`Remover seleção ${job.file.name}`} onClick={() => { onChange(jobs.filter(item => item.id !== job.id)); setError(""); }}>Remover</button>
                </li>)}
            </ul>}
        </div>
    </fieldset>;
}
