import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FilterGroup = {
    key: string;
    title: string;
    values: { value: string; label: string }[];
    selected: string[];
};

type Props = {
    title: string;
    groups: FilterGroup[];
    onToggle: (key: string, value: string) => void;
    onClear: () => void;
};

export function OrderColumnFilter({ title, groups, onToggle, onClear }: Props) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 400 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const id = useId();
    const active = groups.some((group) => group.selected.length > 0);

    function close() {
        setOpen(false);
        triggerRef.current?.focus();
    }

    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const anchor = triggerRef.current?.getBoundingClientRect();
            if (!anchor) return;
            const width = Math.min(288, window.innerWidth - 16);
            const below = window.innerHeight - anchor.bottom - 16;
            const above = anchor.top - 16;
            const useBelow = below >= Math.min(320, above);
            const maxHeight = Math.max(80, Math.min(440, useBelow ? below : above));
            const height = Math.min(panelRef.current?.scrollHeight ?? maxHeight, maxHeight);
            setPosition({
                left: Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8)),
                top: useBelow ? anchor.bottom + 8 : Math.max(8, anchor.top - height - 8),
                maxHeight,
            });
        }
        place();
        panelRef.current?.focus();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function outside(event: PointerEvent) {
            if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }
        function escape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                triggerRef.current?.focus();
            }
        }
        function focusOutside(event: FocusEvent) {
            if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
        }
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape, true);
        document.addEventListener("focusin", focusOutside);
        return () => {
            document.removeEventListener("pointerdown", outside);
            document.removeEventListener("keydown", escape, true);
            document.removeEventListener("focusin", focusOutside);
        };
    }, [open]);

    return <>
        <button ref={triggerRef} type="button" aria-label={`Filtrar ${title}${active ? ", filtros ativos" : ""}`} title={`Filtrar ${title}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)} className={`rounded-lg p-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "text-slate-500 hover:bg-white hover:text-blue-700"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 4h16l-6 7v7l-4 2v-9L4 4Z" /></svg>
        </button>
        {open && createPortal(
            <div data-supplier-ui ref={panelRef} id={id} role="dialog" aria-label={`Filtros de ${title}`} tabIndex={-1} style={{ ...position, width: "min(288px, calc(100vw - 16px))" }} className="fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                    <h3 className="text-sm font-semibold">Filtrar {title}</h3>
                    <button type="button" onClick={close} aria-label="Fechar filtros" className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">✕</button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {groups.map((group) => <fieldset key={group.key} className="mb-3 last:mb-0">
                        <legend className="mb-1 text-xs font-semibold text-slate-600">{group.title}</legend>
                        {group.values.length === 0 && <p className="text-xs text-slate-600">Sem valores nesta etapa</p>}
                        <div className="max-h-32 overflow-y-auto">
                            {group.values.map(({ value, label }) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-xs hover:bg-slate-50">
                                <input type="checkbox" checked={group.selected.includes(value)} onChange={() => onToggle(group.key, value)} className="h-4 w-4 shrink-0 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
                            </label>)}
                        </div>
                    </fieldset>)}
                </div>
                <div className="flex shrink-0 justify-between border-t border-slate-100 p-2">
                    <button type="button" onClick={onClear} disabled={!active} className="rounded-lg px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40">Limpar filtros</button>
                    <button type="button" onClick={close} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Concluir</button>
                </div>
            </div>, document.body
        )}
    </>;
}
