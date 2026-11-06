import { useEffect, useState } from "react";
import { productImageStorage } from "../services/productImages.service";
import { ProductIcon } from "./ProductIcon";

type Props = { organizationId: string; imageRef?: string; file?: Blob; name: string; className?: string };

export function ProductImage({ organizationId, imageRef, file, name, className = "h-10 w-10" }: Props) {
    const [state, setState] = useState<{ key: unknown; url: string; failed: boolean }>({ key: null, url: "", failed: false });
    const key = file ?? `${organizationId}:${imageRef ?? ""}`;
    useEffect(() => {
        let active = true;
        let url = "";
        async function load() {
            try {
                const blob = file ?? (imageRef ? await productImageStorage.get(organizationId, imageRef) : undefined);
                if (!active) return;
                if (blob) url = URL.createObjectURL(blob);
                setState({ key, url, failed: !!imageRef && !blob });
            } catch { if (active) setState({ key, url: "", failed: true }); }
        }
        void load();
        return () => { active = false; if (url) URL.revokeObjectURL(url); };
    }, [organizationId, imageRef, file, key]);
    const current = state.key === key ? state : null;
    return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-400 ${className}`}>
        {current?.url && !current.failed ? <img src={current.url} alt={`Imagem de ${name}`} onError={() => setState({ ...current, failed: true })} className="h-full w-full object-contain" /> : <span title={current?.failed ? "Imagem indisponível neste navegador" : "Sem imagem"}><ProductIcon name="image" /><span className="sr-only">{current?.failed ? "Imagem indisponível neste navegador" : "Sem imagem"}</span></span>}
    </span>;
}
