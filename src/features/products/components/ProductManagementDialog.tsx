import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = { title: string; onClose: () => void; children: ReactNode; busy?: boolean };
export function ProductManagementDialog({ title, onClose, children, busy = false }: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const cancel = useRef<HTMLButtonElement>(null);
    const id = useId();
    useEffect(() => {
        const previous = document.activeElement;
        const dialog = ref.current;
        dialog?.showModal();
        cancel.current?.focus();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            dialog?.close(); document.body.style.overflow = overflow;
            if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
        };
    }, []);
    return createPortal(<dialog data-supplier-ui ref={ref} aria-modal="true" aria-labelledby={id} aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh_-_1.5rem)] w-[calc(100%_-_1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-5 text-slate-900 shadow-2xl [overflow-wrap:anywhere] backdrop:bg-slate-950/60 sm:p-6">
        <header className="mb-5 flex items-center justify-between gap-3"><h2 id={id} className="text-xl font-bold">{title}</h2><button ref={cancel} type="button" disabled={busy} onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">✕</button></header>
        {children}
    </dialog>, document.body);
}
