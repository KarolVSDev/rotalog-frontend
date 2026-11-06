import { useEffect, useState } from "react";
import type { SupplierOrder } from "../mocks/orders.mock";
import { formatRemaining, getOrderDeadline } from "../utils/orderDeadline";

export function OrderDeadline({ order }: { order: SupplierOrder }) {
    const [now, setNow] = useState(Date.now);
    const deadline = getOrderDeadline(order, now);
    const ticking = deadline.remaining !== null && deadline.remaining > 0;
    useEffect(() => {
        if (!ticking) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [ticking, order.id, order.acceptanceDeadline]);
    return <div className="space-y-1 text-xs text-slate-600 [overflow-wrap:anywhere]">
        <p>{deadline.message}</p>
        <p>{deadline.zoneMessage}</p>
        {deadline.remaining !== null && <p role="timer" aria-live="off" className="font-semibold text-slate-800">{formatRemaining(deadline.remaining)}</p>}
    </div>;
}
