import { useEffect, useState } from "react";
import { getSupplierProducts, subscribeSupplierProducts } from "../services/supplierProducts.service";
import type { SupplierProduct } from "../mocks/products.mock";

export function useSupplierProducts(organizationId: string) {
    const [state, setState] = useState<{ organizationId: string; products: SupplierProduct[]; error: string | null }>({ organizationId: "", products: [], error: null });
    useEffect(() => {
        function refresh() {
            try { setState({ organizationId, products: getSupplierProducts(organizationId), error: null }); }
            catch (error) { setState({ organizationId, products: [], error: error instanceof Error ? error.message : "Não foi possível carregar os produtos." }); }
        }
        const unsubscribe = subscribeSupplierProducts(refresh);
        refresh();
        return unsubscribe;
    }, [organizationId]);
    return state.organizationId === organizationId ? state : { organizationId, products: [], error: null };
}
