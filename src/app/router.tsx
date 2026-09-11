import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shared/components/AppLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-xl font-bold">Ocorreu um erro inesperado.</h2>
        <p className="text-sm mt-2 text-slate-600">Verifique os logs ou tente recarregar a página.</p>
      </div>
    ),
    children: [
      {
        index: true,
        element: (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 text-center">
            <h2 className="text-2xl font-semibold text-slate-800">Bem-vindo ao Portal RotaLog</h2>
            <p className="text-slate-600 mt-2 text-sm">
              Estrutura inicial de rotas, Tailwind e responsividade a partir de 360px configurada com sucesso.
            </p>
          </div>
        ),
      },
    ],
  },
]);