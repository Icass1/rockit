"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useGestureDecision } from "@/components/MobilePlayer/hooks/useGestureDecision";
import { useSheetAnimation } from "@/components/MobilePlayer/hooks/useSheetAnimation";

interface UseSheetGestureOptions {
    sheetRef: RefObject<HTMLDivElement | null>;
    backdropRef: RefObject<HTMLDivElement | null>;
    panelRef: RefObject<HTMLDivElement | null>;
    panelScrollRef: RefObject<HTMLDivElement | null>;
    panelOpen: boolean;
    onDismissSheet: () => void;
    onDismissPanel: () => void;
}

export function useSheetGesture({
    sheetRef,
    backdropRef,
    panelRef,
    panelScrollRef,
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
        panelRef,
        panelScrollRef,
        panelOpen,
    });

    const rafRef = useRef(0);
    const capturedPointerRef = useRef<number | null>(null);

    const releasePointer = useCallback((e: React.PointerEvent): void => {
        const capturedId = capturedPointerRef.current;
        if (capturedId === null) return;

        const target = e.currentTarget as HTMLElement | null;
        if (target && target.hasPointerCapture(capturedId)) {
            target.releasePointerCapture(capturedId);
        }
        capturedPointerRef.current = null;
    }, []);

    const onPointerDown = useCallback(
        (e: React.PointerEvent): void => {
            gestureHandlers.onPointerDown(e);
        },
        [gestureHandlers]
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent): void => {
            gestureHandlers.onPointerMove(e);
            const d = decision.current;
            if (!d || d.dy <= 0) return;

            if (capturedPointerRef.current !== e.pointerId) {
                const target = e.currentTarget as HTMLElement | null;
                if (target && !target.hasPointerCapture(e.pointerId)) {
                    target.setPointerCapture(e.pointerId);
                }
                capturedPointerRef.current = e.pointerId;
            }

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                if (d.target === "panel") animRef.current.movePanel(d.dy);
                else animRef.current.moveSheet(d.dy);
            });
        },
        [gestureHandlers, decision]
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent): void => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }

            releasePointer(e);
            gestureHandlers.onPointerUp(e);

            const d = decision.current;
            if (!d) return;
            animRef.current.apply(d);
        },
        [gestureHandlers, decision, releasePointer]
    );

    const onPointerCancel = useCallback(
        (e: React.PointerEvent): void => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }

            releasePointer(e);
            gestureHandlers.onPointerCancel(e);

            const d = decision.current;
            if (!d) return;
            animRef.current.apply({ ...d, dismiss: false });
        },
        [gestureHandlers, decision, releasePointer]
    );

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
    };
}
