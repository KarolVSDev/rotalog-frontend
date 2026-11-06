import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SupplierOrder } from "../../orders/mocks/orders.mock";
import { getCatalogDistribution, getDailyOrders, type getDashboardOrders } from "../utils/dashboardData";
import type { ProductAvailability } from "../../products/mocks/products.mock";

type Props = { orders: SupplierOrder[]; organizationId: string; year: number; stages: ReturnType<typeof getDashboardOrders>["stages"]; products: { availability: ProductAvailability }[]; inventoryError: string | null };
const card = "min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const title = "text-base font-semibold text-slate-900";

function Counts({ data }: { data: { name: string; count: number; color: string }[] }) {
    return <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">{data.map(item => <li key={item.name} className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}: <strong>{item.count}</strong></li>)}</ul>;
}

export function DashboardCharts({ orders, organizationId, year, stages, products, inventoryError }: Props) {
    const [period, setPeriod] = useState(30);
    const daily = getDailyOrders(orders, organizationId, period, new Date(), year);
    const currentYear = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date()).slice(0, 4));
    const catalog = getCatalogDistribution(products);
    const periodTotal = daily.reduce((sum, day) => sum + day.count, 0);
    return <>
        <section className={card} aria-labelledby="orders-stage-title">
            <h2 id="orders-stage-title" className={title}>Pedidos por situação</h2>
            <p className="mt-1 text-sm text-slate-600">Etapas do Kanban. Recusados integram Finalizados.</p>
            <div className="mt-4 h-72 min-w-0" role="group" aria-label="Gráfico de pedidos por situação">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={stages} layout="vertical" margin={{ right: 24 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={132} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "#f1f5f9" }} />
                        <Bar dataKey="count" name="Pedidos" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>{stages.map(stage => <Cell key={stage.id} fill={stage.color} />)}</Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <Counts data={stages} />
        </section>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={card} aria-labelledby="orders-period-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="orders-period-title" className={title}>Pedidos por período</h2>
                    <label className="flex items-center gap-2 text-sm text-slate-600">Período<select aria-label="Período" value={period} onChange={event => setPeriod(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600">{[7, 30, 90].map(days => <option key={days} value={days}>Últimos {days} dias</option>)}</select></label>
                </div>
                <p className="mt-2 text-sm text-slate-600">{periodTotal} pedidos recebidos no período{year === currentYear ? ", incluindo hoje (Manaus)." : `, até 31/12/${year}.`}</p>
                <p className="mt-1 text-xs text-slate-600">Janela limitada a {year}: {daily[0]?.date.split("-").reverse().join("/")} a {daily.at(-1)?.date.split("-").reverse().join("/")}.</p>
                <div className="mt-4 h-60 min-w-0" role="group" aria-label="Gráfico diário de pedidos recebidos">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={daily} margin={{ left: -20, right: 12, top: 8 }} accessibilityLayer>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#475569", fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }} />
                            <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date?.split("-").reverse().join("/")} />
                            <Line type="linear" dataKey="count" name="Pedidos recebidos" stroke="#2563eb" strokeWidth={2} dot={period <= 7} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {periodTotal === 0 && <p className="text-sm text-slate-600">Nenhum pedido recebido neste período.</p>}
                <details className="mt-3 text-sm text-slate-700"><summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-blue-600">Consultar valores por dia</summary>
                    <div className="mt-2 max-h-48 overflow-y-auto" tabIndex={0} role="region" aria-label="Valores diários de pedidos"><table className="w-full text-left"><caption className="sr-only">Pedidos recebidos por data</caption><thead><tr><th scope="col">Data</th><th scope="col">Pedidos</th></tr></thead><tbody>{daily.map(day => <tr key={day.date}><td className="py-1">{day.date.split("-").reverse().join("/")}</td><td>{day.count}</td></tr>)}</tbody></table></div>
                </details>
            </section>
            <section className={card} aria-labelledby="catalog-title">
                <h2 id="catalog-title" className={title}>Situação do catálogo</h2>
                <p className="mt-2 text-sm text-slate-600">Situação atual do catálogo, após reservas. Independente do ano selecionado.</p>
                {inventoryError ? <p role="alert" className="mt-5 break-words text-sm text-red-700">Não foi possível consultar o catálogo: {inventoryError}</p> : products.length === 0 ? <p className="flex h-60 items-center justify-center text-sm text-slate-600">Nenhum produto para esta organização.</p> : <>
                    <div className="mt-4 h-60 min-w-0" role="group" aria-label="Gráfico da disponibilidade do catálogo"><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart accessibilityLayer><Pie data={catalog.filter(item => item.count > 0)} dataKey="count" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>{catalog.filter(item => item.count > 0).map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                    <p className="text-center text-sm text-slate-600">{products.length} produtos no catálogo</p>
                </>}
                {!inventoryError && <Counts data={catalog} />}
            </section>
        </div>
    </>;
}
