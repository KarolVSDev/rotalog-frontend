import { useEffect, useState } from "react";
import { formatRemaining } from "../utils/orderDeadline";
import type { ApiOrder } from "./contracts";

export function ApiOrderDeadline({ order }: { order: ApiOrder }) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const instant = Date.parse(order.acceptance_deadline);
    if (!Number.isFinite(instant)) return <p className="text-xs text-slate-600">Prazo para aceite não disponível.</p>;
    return <div className="mt-2 space-y-1 text-xs text-slate-600">
        <p>Prazo para aceite: {new Date(instant).toLocaleString("pt-BR", { timeZone: "America/Manaus", timeZoneName: "short" })}.</p>
        {order.state === "AWAITING_SUPPLIER_DECISION" && <p role="timer" className="font-semibold">{formatRemaining(Math.max(0, instant - now))}</p>}
    </div>;
}
