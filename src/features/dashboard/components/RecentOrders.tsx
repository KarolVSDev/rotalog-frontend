
import type { CommercialStatus, CustodyStatus, SupplierOrder, SupplierOrderStatus } from "../../orders/mocks/orders.mock";

import { Link } from "react-router-dom";

type RecentOrdersProps = {
    orders: SupplierOrder[];
    displayIds: Map<string, string>;
};

const statusStyles: Record<CommercialStatus | CustodyStatus | SupplierOrderStatus, string> = {
    "Aguardando aceite": "bg-amber-100 text-amber-800",
    Aceito: "bg-emerald-100 text-emerald-800",
    Recusado: "bg-red-100 text-red-800",
    "Aguardando separação": "bg-slate-100 text-slate-700",
    "Pronto para coleta": "bg-teal-100 text-teal-800",
    Pendente: "bg-amber-100 text-amber-800",
    "Em separação": "bg-blue-100 text-blue-800",
    "Em transporte": "bg-violet-100 text-violet-800",
    Entregue: "bg-emerald-100 text-emerald-800",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

export function RecentOrders({ orders, displayIds }: RecentOrdersProps) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div><h2 className="text-base font-semibold text-slate-900">
                    Pedidos recentes
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Os cinco pedidos mais recentes
                </p></div>
                <Link to="/fornecedor/pedidos" className="rounded text-sm font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">Ver todos os pedidos</Link>
            </div>

            <div role="region" aria-label="Rolagem de pedidos recentes" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th scope="col" className="px-5 py-3">Pedido</th>
                            <th scope="col" className="px-5 py-3">Cliente</th>
                            <th scope="col" className="px-5 py-3">Data</th>
                            <th scope="col" className="px-5 py-3">Valor</th>
                            <th scope="col" className="px-5 py-3">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.map((order) => {
                            const status = order.commercialStatus === "Recusado" ? "Recusado"
                                : order.commercialStatus === "Aguardando aceite" ? "Aguardando aceite"
                                : order.custodyStatus && order.custodyStatus !== "Aguardando separação" ? order.custodyStatus
                                : order.commercialStatus ?? order.custodyStatus ?? order.status;
                            return (
                            <tr
                                key={`${order.organizationId}:${order.id}`}
                                className="border-t border-slate-100"
                            >
                                <td className="px-5 py-4 font-medium text-slate-900">
                                    <span title={displayIds.get(order.id) ?? order.id} className="block max-w-48 truncate">{displayIds.get(order.id) ?? order.id}</span>
                                </td>
                                <td className="min-w-40 max-w-72 break-words px-5 py-4 [overflow-wrap:anywhere]">{order.customer}</td>
                                <td className="px-5 py-4">
                                    {order.date.split("-").reverse().join("/")}
                                </td>
                                <td className="px-5 py-4">
                                    {currencyFormatter.format(order.total)}
                                </td>
                                <td className="px-5 py-4">
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status]
                                            }`}
                                    >
                                        {status}
                                    </span>
                                </td>
                            </tr>
                            );
                        })}
                        {orders.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nenhum pedido para esta organização.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
