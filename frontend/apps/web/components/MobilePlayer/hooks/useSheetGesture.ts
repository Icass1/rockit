"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useGestureDecision } from "@/components/MobilePlayer/hooks/useGestureDecision";
import { useSheetAnimation } from "@/components/MobilePlayer/hooks/useSheetAnimation";

interface UseSheetGestureOptions {
    sheetRef: RefObject<HTMLDivElement | null>;
    backdropRef: RefObject<HTMLDivElement | null>;
    panelRef: RefObject<HTMLDivElement | null>;
    panelOpen: boolean;
    onDismissSheet: () => void;
    onDismissPanel: () => void;
}

export function useSheetGesture({
    sheetRef,
    backdropRef,
    panelRef,
    panelOpen,
    onDismissSheet,
    onDismissPanel,
}: UseSheetGestureOptions): {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
} {
    const anim = useSheetAnimation({
        sheetRef,
        backdropRef,
        panelRef,
        onSheetDismissed: onDismissSheet,
        onPanelDismissed: onDismissPanel,
    });

    const animRef = useRef(anim);
    useEffect(() => {
        animRef.current = anim;
    });

    const { decision, ...gestureHandlers } = useGestureDecision({
        panelOpen,
    });

    const rafRef = useRef(0);

    const onPointerDown = useCallback(
        (e: React.PointerEvent): void => {
            gestureHandlers.onPointerDown(e);
        },
        [gestureHandlers],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent): void => {
            gestureHandlers.onPointerMove(e);
            const d = decision.current;
            if (!d || d.dy <= 0) return;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                if (d.target === "panel") animRef.current.movePanel(d.dy);
                else animRef.current.moveSheet(d.dy);
            });
        },
        [gestureHandlers, decision],
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent): void => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }

            gestureHandlers.onPointerUp(e);

            const d = decision.current;
            if (!d) return;
            animRef.current.apply(d);
        },
        [gestureHandlers, decision],
    );

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
    };
}
