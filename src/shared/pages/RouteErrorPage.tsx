import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

export function RouteErrorPage() {
    const error = useRouteError();
    if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section role="alert" className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Não foi possível carregar esta página</h1>
            <p className="mt-3 text-sm text-slate-600">Ocorreu um erro inesperado. Tente novamente ou volte ao início.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Tentar novamente</button>
                <Link to="/" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Voltar ao início</Link>
            </div>
        </section>
    </main>;
}
