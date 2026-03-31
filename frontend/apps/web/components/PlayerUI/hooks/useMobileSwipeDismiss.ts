import { useEffect, useRef, useState } from "react";

interface SwipeDismissOptions {
    /**
     * When true the gesture is ignored (e.g. queue/lyrics sub-panel is open).
     * Pass this as state from the parent — it's synced to a ref internally so
     * listeners are NEVER re-registered when it changes.
     */
    blocked: boolean;
    /** Called when the dismiss gesture completes (after the slide-out animation). */
    onHide: () => void;
}

/**
 * Swipe-down-to-dismiss for MobilePlayerUI.
 *
 * iOS/Android optimisations:
 * - Every transient gesture value is a ref, NOT state → listeners register once
 *   and are never torn down mid-gesture due to a re-render.
 * - `topOffset` is the only state (drives the `top` inline style).
 * - All listeners are `{ passive: true }` → browser never blocks scroll.
 * - Set `touch-action: pan-y` on the element for smooth horizontal scroll pass-through.
 * - `blocked` is synced via ref so changing it never re-registers listeners.
 */
export function useMobileSwipeDismiss({
    blocked,
    onHide,
}: SwipeDismissOptions) {
    const divRef = useRef<HTMLDivElement>(null);
    const [topOffset, setTopOffset] = useState(0);

    // All gesture state in refs — zero re-renders during a swipe
    const blockedRef = useRef(blocked);
    const onHideRef = useRef(onHide);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const startTimeRef = useRef(0);
    const cancelledRef = useRef(false);
    const topOffsetRef = useRef(0); // mirror of state, readable in handlers

    // Keep refs in sync when they change — avoids updating refs during render
    useEffect(() => {
        blockedRef.current = blocked;
        onHideRef.current = onHide;
    }, [blocked, onHide]);

    const updateOffset = (value: number) => {
        topOffsetRef.current = value;
        setTopOffset(value);
    };

    useEffect(() => {
        const el = divRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (blockedRef.current) return;
            const t = e.targetTouches[0];
            startXRef.current = t.pageX;
            startYRef.current = t.pageY;
            startTimeRef.current = Date.now();
            cancelledRef.current = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (blockedRef.current || cancelledRef.current) {
                if (topOffsetRef.current !== 0) updateOffset(0);
                return;
            }

            const t = e.targetTouches[0];
            const dY = t.pageY - startYRef.current;
            const dX = t.pageX - startXRef.current;

            // Cancel if more horizontal than vertical (< 3:1 ratio)
            if (Math.abs(dX) > 0 && Math.abs(dY / dX) < 3) {
                cancelledRef.current = true;
                updateOffset(0);
                return;
            }

            // Only follow downward movement
            if (dY > 0) updateOffset(dY);
        };

        const handleTouchEnd = () => {
            if (blockedRef.current || cancelledRef.current) {
                cancelledRef.current = false;
                updateOffset(0);
                return;
            }

            const elapsed = Date.now() - startTimeRef.current;
            const offset = topOffsetRef.current;

            const isFastFlick = elapsed > 0 && offset / elapsed > 0.7; // px/ms
            const isFarEnough = offset > window.innerHeight / 3;

            if (isFastFlick || isFarEnough) {
                // Slide the rest of the way down, then hide
                updateOffset(window.innerHeight);
                setTimeout(() => {
                    onHideRef.current();
                    updateOffset(0);
                }, 300);
            } else {
                // Snap back to 0
                updateOffset(0);
            }
        };

        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: true });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
        // Empty deps: handlers are stable via refs. They NEVER re-register.
    }, []);

    return { divRef, topOffset };
}
