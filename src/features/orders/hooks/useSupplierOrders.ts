import { useEffect, useState } from "react";
import { readSupplierOrders, subscribeSupplierOrders } from "../services/supplierOrders.service";
import type { SupplierOrder } from "../mocks/orders.mock";

function readState(): { orders: SupplierOrder[]; error: string | null } {
    try { return { orders: readSupplierOrders(), error: null }; }
    catch (error) { return { orders: [], error: error instanceof Error ? error.message : "Não foi possível ler os pedidos salvos." }; }
}

export function useSupplierOrders() {
    const [state, setState] = useState(readState);
    useEffect(() => {
        const refresh = () => setState(readState());
        const unsubscribe = subscribeSupplierOrders(refresh);
        refresh();
        return unsubscribe;
    }, []);
    return state;
}
