import { useState } from "react";
import type { Organization } from "../../organizations/mocks/organizations.mock";
import { ProductIcon } from "../../products/components/ProductIcon";
import { useSupplierOrders } from "../../orders/hooks/useSupplierOrders";
import { getOrderDisplayIds } from "../../orders/utils/orderDisplayId";
import { useSupplierStockMovements } from "../hooks/useSupplierStockMovements";
import { stockMovementLabels, type StockMovementType } from "../models/stockMovement";
import { filterStockMovements } from "../services/stockMovements";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Manaus" });
const sourceLabels = { "order-acceptance": "Aceite do pedido", "product-create": "Cadastro de produto", "xlsx-import": "Importação XLSX" };

export function StockMovementHistory({ organization }: { organization: Organization }) {
    const { movements, error } = useSupplierStockMovements(organization.id);
    const { orders } = useSupplierOrders();
    const displayIds = getOrderDisplayIds(orders);
    const [search, setSearch] = useState("");
    const [type, setType] = useState<"all" | StockMovementType>("all");
    const filtered = filterStockMovements(movements, search, type, displayIds);
    const hasFilters = !!search.trim() || type !== "all";
    function clear() { setSearch(""); setType("all"); }

    return <section aria-labelledby="stock-movement-title" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center">
            <div>
                <h2 id="stock-movement-title" className="text-base font-semibold text-slate-900">Histórico de movimentações</h2>
                <p aria-live="polite" className="mt-0.5 text-xs text-slate-500">{filtered.length} de {movements.length} movimentação(ões) · Horário de Manaus</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="relative w-full min-w-0 sm:w-64 sm:flex-1">
                    <label htmlFor="stock-movement-search" className="sr-only">Pesquisar movimentações por produto, código ou pedido</label>
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><ProductIcon name="search" /></span>
                    <input id="stock-movement-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Produto, código ou pedido" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="relative max-w-full flex-1 sm:flex-none">
                    <label htmlFor="stock-movement-type" className="sr-only">Tipo de movimentação</label>
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><ProductIcon name="filter" /></span>
                    <select id="stock-movement-type" value={type} onChange={event => setType(event.target.value as "all" | StockMovementType)} className="h-9 w-full max-w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="all">Todos os tipos</option>
                        {Object.entries(stockMovementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                {hasFilters && <button type="button" onClick={clear} className="h-9 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">Limpar</button>}
            </div>
        </div>
        {error ? <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : filtered.length ? <div role="region" aria-label="Rolagem do histórico de movimentações" tabIndex={0} className="max-h-96 overflow-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
            <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600"><tr>{["Data e hora", "Produto / Código", "Tipo", "Quantidade", "Pedido", "Organização"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(item => <tr key={item.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600"><time dateTime={item.occurredAt}>{dateFormatter.format(new Date(item.occurredAt))}</time></td>
                    <td className="max-w-64 [overflow-wrap:anywhere] px-4 py-2.5"><p className="font-medium text-slate-900">{item.productName}</p><p className="text-xs text-slate-500">{item.productId}</p></td>
                    <td className="px-4 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${item.type === "reservation" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}>{stockMovementLabels[item.type]}</span><p className="mt-1 text-xs text-slate-500">{sourceLabels[item.source]}</p></td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-2.5 text-slate-700">{item.orderId ? <span title={item.orderId} className="block max-w-40 truncate">{displayIds.get(item.orderId) ?? item.orderId}</span> : "—"}</td>
                    <td className="max-w-48 [overflow-wrap:anywhere] px-4 py-2.5 text-slate-600">{organization.name}</td>
                </tr>)}</tbody>
            </table>
        </div> : <div className="px-4 py-8 text-center text-sm text-slate-500">{hasFilters ? "Nenhuma movimentação corresponde aos filtros." : "Nenhuma movimentação registrada para este fornecedor."}</div>}
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Inclui somente operações registradas; saldos anteriores não geram lançamentos retroativos.</p>
    </section>;
}
