"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
import { usePopupMenu } from "@/components/PopupMenu/context";

// Margen de seguridad respecto al footer (96px) y bordes
const FOOTER_HEIGHT = 96;
const EDGE_MARGIN = 4;

function calcPosition(
    pos: [number, number],
    width: number,
    height: number,
    triggerRect: DOMRect | undefined,
    attempt = 1
): [number, number] {
    let [x, y] = pos;

    if (y + height > document.body.offsetHeight - FOOTER_HEIGHT) {
        y = document.body.offsetHeight - FOOTER_HEIGHT - height - EDGE_MARGIN;
    }

    if (x + width > document.body.offsetWidth) {
        x = document.body.offsetWidth - EDGE_MARGIN - width;
    }

    if (triggerRect) {
        const overlapsX =
            x + width > triggerRect.x && x < triggerRect.x + triggerRect.width;
        const overlapsY =
            y + height > triggerRect.y &&
            y < triggerRect.y + triggerRect.height;

        if (overlapsX && overlapsY) {
            if (attempt === 1) {
                return calcPosition(
                    [triggerRect.x, triggerRect.y + triggerRect.height + 10],
                    width,
                    height,
                    triggerRect,
                    2
                );
            } else if (attempt === 2) {
                return calcPosition(
                    [triggerRect.x - width - 10, triggerRect.y],
                    width,
                    height,
                    triggerRect,
                    3
                );
            }
        }
    }

    return [x, y];
}

// Portal singleton (module-level). Solo para entorno cliente.
let portalSingleton: HTMLElement | null = null;
function getOrCreatePortalClient(): HTMLElement | null {
    if (typeof document === "undefined") return null;
    if (portalSingleton) return portalSingleton;

    const existing = document.getElementById("popup-menu-portal");
    if (existing) {
        portalSingleton = existing;
        return existing;
    }

    const div = document.createElement("div");
    div.id = "popup-menu-portal";
    document.body.appendChild(div);
    portalSingleton = div;
    return div;
}

export default function PopupMenuContent({
    children,
}: {
    children?: ReactNode;
}) {
    const { open, setOpen, pos, contentRef, triggerRef } = usePopupMenu();

    // Safety: this component is client-only (`"use client"`), pero reafirmamos.
    if (typeof window === "undefined") return null;

    // Obtener portal (module-level singleton). NO es un ref y NO leemos ref.current.
    const portal = getOrCreatePortalClient();
    if (!portal || !children) return null;

    const isMobile = window.innerWidth < 768;
    const isValidPos = pos[0] !== 0 || pos[1] !== 0;
    if (!isMobile && !isValidPos) return null;

    // Nota: triggerRef.current solo se accede cuando handleDimensions se ejecuta
    // (PosAfterRenderDiv lo llamará después del render), por lo que NO leemos refs aquí.
    const handleDimensions = isMobile
        ? undefined
        : (width: number, height: number) => {
              const triggerRect = triggerRef.current?.getBoundingClientRect();
              return calcPosition(pos, width, height, triggerRect);
          };

    return createPortal(
        <PosAfterRenderDiv
            divRef={contentRef}
            onDimensionsCalculated={handleDimensions}
            onClick={() => setOpen(false)}
            style={{ display: open ? "block" : "none" }}
            className="fixed top-0 left-0 z-50 h-[calc(100%-4rem)] w-full overflow-auto rounded-md bg-neutral-800/90 px-10 md:h-auto md:w-max md:p-1 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
        >
            <div className="flex h-full flex-col gap-y-1 overflow-y-auto py-20 md:py-0">
                {children}
                <div className="min-h-2 md:hidden" />
            </div>
        </PosAfterRenderDiv>,
        portal
    );
}
