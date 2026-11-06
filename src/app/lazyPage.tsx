import { lazy, Suspense, type ComponentType } from "react";

export function lazyPage(load: () => Promise<{ default: ComponentType }>) {
    const Page = lazy(load);
    return function LazyPage() {
        return <Suspense fallback={<div role="status" aria-live="polite" className="min-h-40 p-6 text-sm text-slate-600">Carregando página…</div>}><Page /></Suspense>;
    };
}
