import { lazy, Suspense, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../../../shared/components/PageHeader";
import { RecentOrders } from "../components/RecentOrders";
import type { Organization } from "../../organizations/mocks/organizations.mock";
import { useSupplierOrders } from "../../orders/hooks/useSupplierOrders";
import { useSupplierInventory } from "../../inventory/hooks/useSupplierInventory";
import { getOrderDisplayIds } from "../../orders/utils/orderDisplayId";
import { getDashboardOrders, getDashboardYears } from "../utils/dashboardData";

const DashboardCharts = lazy(() => import("../components/DashboardCharts").then(module => ({ default: module.DashboardCharts })));
export function SupplierDashboard() {
    const { activeOrganization } = useOutletContext<{ activeOrganization: Organization }>();
    const { orders, error } = useSupplierOrders();
    const inventory = useSupplierInventory(activeOrganization.id);
    const years = getDashboardYears(orders, activeOrganization.id);
    const [selection, setSelection] = useState<{ organizationId: string; year: number } | null>(null);
    const currentYear = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Manaus" }).format(new Date()).slice(0, 4));
    const year = selection?.organizationId === activeOrganization.id && years.includes(selection.year) ? selection.year : currentYear;
    const { metrics, stages, recent } = getDashboardOrders(orders, activeOrganization.id, year);
    const displayIds = getOrderDisplayIds(orders);
    return <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4">
        <PageHeader title="Visão geral" subtitle="Acompanhe os principais indicadores e pedidos do fornecedor." actions={<label className="flex items-center gap-2 text-sm text-slate-600">Ano<select aria-label="Ano do Dashboard" value={year} onChange={event => setSelection({ organizationId: activeOrganization.id, year: Number(event.target.value) })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600">{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>} />
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Não foi possível consultar os pedidos: {error}</p> : <>
            <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(metric => <Link key={metric.id} to="/fornecedor/pedidos" aria-label={`${metric.title}: ${metric.value}. Ver pedidos`} className="flex h-full min-w-0 rounded-xl transition hover:ring-2 hover:ring-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><MetricCard title={metric.title} value={metric.value} /></Link>)}
            </div>
            {metrics[0].value === 0 && <p role="status" className="text-sm text-slate-600">Nenhum pedido em {year} para esta organização.</p>}
            <Suspense fallback={<p role="status" className="p-5 text-sm text-slate-600">Carregando gráficos…</p>}><DashboardCharts orders={orders} organizationId={activeOrganization.id} year={year} stages={stages} products={inventory.products} inventoryError={inventory.error} /></Suspense>
            <RecentOrders orders={recent} displayIds={displayIds} />
        </>}
    </div>;
}
