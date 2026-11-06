import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ProductAvailability } from "../mocks/products.mock";
import { ProductIcon } from "./ProductIcon";

type Props = {
    value: "Todos" | ProductAvailability;
    options: ("Todos" | ProductAvailability)[];
    hasActiveFilters: boolean;
    onChange: (value: "Todos" | ProductAvailability) => void;
    onClear: () => void;
};
export function ProductAvailabilityFilter({ value, options, hasActiveFilters, onChange, onClear }: Props) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const anchor = trigger.current?.getBoundingClientRect();
            const menu = panel.current;
            if (!anchor || !menu) return;
            const width = Math.min(256, window.innerWidth - 16);
            const height = Math.min(menu.scrollHeight, window.innerHeight - 16);
            menu.style.left = `${Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8))}px`;
            menu.style.top = `${Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - height - 8))}px`;
        }
        place();
        panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
    }, [open]);
    return <>
        <button ref={trigger} type="button" popoverTarget={id} title="Filtrar disponibilidade" aria-label={`Filtrar disponibilidade${value !== "Todos" ? `: ${value}` : ""}`} aria-expanded={open} aria-controls={id} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${value !== "Todos" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}><ProductIcon name="filter" /></button>
        <div ref={panel} id={id} popover="auto" onToggle={(event) => setOpen(event.newState === "open")} className="fixed m-0 max-h-[calc(100dvh_-_16px)] w-[min(256px,calc(100vw_-_16px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl">
            <fieldset><legend className="mb-2 text-sm font-semibold">Disponibilidade</legend>
                {options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"><input type="radio" name={id} checked={value === option} onChange={() => onChange(option)} className="h-4 w-4 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600" />{option === "Todos" ? "Todas as disponibilidades" : option}</label>)}
            </fieldset>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
                <button type="button" disabled={!hasActiveFilters} onClick={onClear} className="rounded-lg px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40">Limpar filtros</button>
                <button type="button" popoverTarget={id} popoverTargetAction="hide" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Concluir</button>
            </div>
        </div>
    </>;
}
