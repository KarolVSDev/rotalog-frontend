import { createContext, useContext, useSyncExternalStore } from "react";
import { OrdersRepository, type OrdersState } from "./ordersRepository";
import { orderMetrics } from "./orderAdapter";

export const OrdersContext = createContext<OrdersRepository | null>(null);
export function useApiOrders() {
    const repository = useContext(OrdersContext);
    if (!repository) throw new Error("Pedidos API precisam do ApiOrdersProvider.");
    const state = useSyncExternalStore(repository.subscribe, repository.snapshot);
    return { ...state, repository };
}
const emptyState: OrdersState = { orders: [], loading: false, loaded: false, error: null };
const emptySubscribe = () => () => {};
const emptySnapshot = () => emptyState;
export function useApiPendingOrders(): number | undefined {
    const repository = useContext(OrdersContext);
    const state = useSyncExternalStore(repository?.subscribe ?? emptySubscribe, repository?.snapshot ?? emptySnapshot);
    return repository && state.loaded && !state.error ? orderMetrics(state.orders)[1].value : undefined;
}
