import { useEffect, useState } from "react";
import { localSupplierStockMovementsService } from "../services/supplierStockMovements.service";
import type { StockMovement } from "../models/stockMovement";

export function useSupplierStockMovements(organizationId: string) {
    const [state, setState] = useState<{ organizationId: string; movements: StockMovement[]; error: string | null }>({ organizationId: "", movements: [], error: null });
    useEffect(() => {
        function refresh() {
            try { setState({ organizationId, movements: localSupplierStockMovementsService.list(organizationId), error: null }); }
            catch (error) { setState({ organizationId, movements: [], error: error instanceof Error ? error.message : "Não foi possível carregar o histórico de movimentações." }); }
        }
        const unsubscribe = localSupplierStockMovementsService.subscribe(refresh);
        refresh();
        return unsubscribe;
    }, [organizationId]);
    return state.organizationId === organizationId ? state : { organizationId, movements: [], error: null };
}
