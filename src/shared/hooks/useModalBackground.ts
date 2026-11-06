import { useEffect, type RefObject } from "react";

// Para os overlays existentes renderizados via Portal: bloqueia também teclado
// e tecnologias assistivas no fundo, preservando os valores anteriores.
export function useModalBackground(overlayRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const previous = Array.from(document.body.children)
            .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay && !element.contains(overlay))
            .map(element => ({ element, inert: element.inert }));
        previous.forEach(({ element }) => { element.inert = true; });
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            previous.forEach(({ element, inert }) => { element.inert = inert; });
            document.body.style.overflow = overflow;
        };
    }, [overlayRef]);
}
