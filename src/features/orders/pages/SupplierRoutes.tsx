import {Link} from "react-router-dom";
import {PageHeader} from "../../../shared/components/PageHeader";
import {StatusBadge, SupplierIcon} from "../../../shared/components/SupplierVisuals";

export function SupplierRoutes() {
    return <div className="space-y-6"><PageHeader title="Rotas e acompanhamento" subtitle="Visibilidade da operação, da prontidão para coleta até o destino."/>
        <section className="supplier-route-empty rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Disponibilidade do acompanhamento">
            <span className="supplier-route-icon"><SupplierIcon name="routes" className="h-10 w-10"/></span><StatusBadge tone="warning">Integração pendente</StatusBadge>
            <h2 className="mt-5 text-xl font-semibold">O acompanhamento estará aqui</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">O acompanhamento dos seus pedidos ainda não está disponível. Consulte a preparação e a prontidão para coleta na tela de Pedidos.</p>
            <Link to="/fornecedor/pedidos" className="supplier-button mt-6 inline-flex items-center gap-2">Consultar pedidos<SupplierIcon name="arrow"/></Link>
            
        </section></div>;
}
