"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { GestureDecision } from "@/components/MobilePlayer/hooks/useGestureDecision";

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

interface UseSheetAnimationOptions {
    sheetRef: RefObject<HTMLDivElement | null>;
    backdropRef: RefObject<HTMLDivElement | null>;
    panelRef: RefObject<HTMLDivElement | null>;
    onSheetDismissed: () => void;
    onPanelDismissed: () => void;
}

export function useSheetAnimation({
    sheetRef,
    backdropRef,
    panelRef,
    onSheetDismissed,
    onPanelDismissed,
}: UseSheetAnimationOptions): {
    apply: (decision: GestureDecision) => void;
    moveSheet: (dy: number) => void;
    movePanel: (dy: number) => void;
} {
    const cbRef = useRef({ onSheetDismissed, onPanelDismissed });
    useEffect(() => {
        cbRef.current = { onSheetDismissed, onPanelDismissed };
    });

    const moveSheet = useCallback(
        (dy: number): void => {
            const el = sheetRef.current;
            if (!el) return;
            el.style.transition = "none";
            el.style.transform = `translateY(${dy}px)`;
            if (backdropRef.current) {
                backdropRef.current.style.transition = "none";
                backdropRef.current.style.opacity = String(
                    Math.max(0, 1 - dy / (window.innerHeight * 0.6)),
                );
            }
        },
        [sheetRef, backdropRef],
    );

    const snapSheet = useCallback((): void => {
        const el = sheetRef.current;
        if (!el) return;
        el.style.transition = `transform 0.3s ${SPRING}`;
        el.style.transform = "";
        if (backdropRef.current) {
            backdropRef.current.style.transition = "opacity 0.3s ease-out";
            backdropRef.current.style.opacity = "";
        }
    }, [sheetRef, backdropRef]);

    const dismissSheet = useCallback((): void => {
        const el = sheetRef.current;
        if (!el) return;
        el.style.transition = `transform 0.35s ${SPRING}`;
        el.style.transform = `translateY(${window.innerHeight}px)`;
        if (backdropRef.current) {
            backdropRef.current.style.transition = "opacity 0.25s ease-out";
            backdropRef.current.style.opacity = "0";
        }
        setTimeout(() => {
            if (el) {
                el.style.transition = "";
                el.style.transform = "";
            }
            if (backdropRef.current) {
                backdropRef.current.style.transition = "";
                backdropRef.current.style.opacity = "";
            }
            cbRef.current.onSheetDismissed();
        }, 300);
    }, [sheetRef, backdropRef]);

    const movePanel = useCallback(
        (dy: number): void => {
            const el = panelRef.current;
            if (!el) return;
            el.style.transition = "none";
            el.style.transform = `translateY(${dy}px)`;
        },
        [panelRef],
    );

    const snapPanel = useCallback((): void => {
        const el = panelRef.current;
        if (!el) return;
        el.style.transition = `transform 0.3s ${SPRING}`;
        el.style.transform = "";
    }, [panelRef]);

    const dismissPanel = useCallback((): void => {
        const el = panelRef.current;
        if (!el) return;
        el.style.transition = `transform 0.3s ${SPRING}`;
        el.style.transform = "translateY(100%)";
        setTimeout(() => {
            if (el) {
                el.style.transition = "";
                el.style.transform = "";
            }
            cbRef.current.onPanelDismissed();
        }, 250);
    }, [panelRef]);

    const apply = useCallback(
        (d: GestureDecision): void => {
            if (d.target === "panel") {
                if (d.dismiss) dismissPanel();
                else snapPanel();
            } else {
                if (d.dismiss) dismissSheet();
                else snapSheet();
            }
        },
        [dismissPanel, snapPanel, dismissSheet, snapSheet],
    );

    return { apply, moveSheet, movePanel };
}
