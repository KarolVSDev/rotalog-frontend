import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Header Responsivo */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-blue-600">RotaLog B2B</h1>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
          Demonstração (Simulação)
        </span>
      </header>

      {/* Conteúdo Dinâmico das Páginas */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Rodapé Simples */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        RotaLog &copy; 2026 — Todos os direitos reservados.
      </footer>
    </div>
  );
}