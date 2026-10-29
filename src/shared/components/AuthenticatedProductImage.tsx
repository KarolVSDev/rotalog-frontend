import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../features/auth/context/AuthContext";
import { authenticatedBlobRequest, subscribeSessionExpired } from "../../features/services/apiAuth.service";
import type { CanonicalProductImage } from "../api/productImageTypes";
import { ProductImage } from "./ProductImage";

export function AuthenticatedProductImage({ productId, image, name, className = "h-36 w-full", lazy = true }: {
    productId: string; image?: CanonicalProductImage | null; name: string; className?: string; lazy?: boolean;
}) {
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const container = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
    const path = image ? `/api/v1/products/${productId}/images/${image.id}/content` : "";
    const imageId = image?.id;
    const trustedPath = !!path && image?.content_url === path;
    const canObserve = typeof IntersectionObserver !== "undefined";
    const shouldLoad = !lazy || !canObserve || visible;
    const key = JSON.stringify([user?.id, user?.organization_id, user?.role, productId, image?.id, image?.content_url]);
    useEffect(() => {
        if (visible || !imageId || !lazy || !canObserve) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
        }, { rootMargin: "200px" });
        if (container.current) observer.observe(container.current);
        return () => observer.disconnect();
    }, [visible, lazy, imageId, canObserve]);
    useEffect(() => {
        if (!shouldLoad || !user?.organization_id || !trustedPath) return;
        let active = true, objectUrl = "";
        const controller = new AbortController();
        const dispose = () => { active = false; controller.abort(); if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ""; } };
        const unsubscribe = subscribeSessionExpired(() => { dispose(); setLoaded(null); });
        void authenticatedBlobRequest(path, user.organization_id, controller.signal).then(blob => {
            if (!active) return;
            objectUrl = URL.createObjectURL(blob);
            setLoaded({ key, url: objectUrl });
        }).catch(() => { if (active) setLoaded(null); });
        return () => { unsubscribe(); dispose(); };
    }, [key, path, shouldLoad, user?.organization_id, trustedPath]);
    return <div ref={container} className={`min-w-0 ${className}`}>
        <ProductImage name={name} alt={image?.alt_text?.trim()} src={loaded?.key === key && user ? loaded.url : null} className="h-full w-full"/>
    </div>;
}
