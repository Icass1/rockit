"use client";

import type { RefObject } from "react";
import { useCallback, useRef } from "react";

const LOCK_THRESHOLD = 8;
const DISMISS_RATIO = 0.33;
const VELOCITY_THRESHOLD = 0.6;

export type GestureTarget = "sheet" | "panel";
type Direction = "h" | "v" | null;

interface GestureState {
    startX: number;
    startY: number;
    startTime: number;
    lastY: number;
    lastTime: number;
    originTarget: EventTarget | null;
    direction: Direction;
    target: GestureTarget | null;
    scrolledToTop: boolean;
    active: boolean;
}

export interface GestureDecision {
    target: GestureTarget;
    dy: number;
    velocity: number;
    dismiss: boolean;
}

interface UseGestureDecisionOptions {
    panelRef: RefObject<HTMLDivElement | null>;
    panelScrollRef: RefObject<HTMLDivElement | null>;
    panelOpen: boolean;
}

function isInsidePanel(
    target: EventTarget | null,
    panelEl: HTMLElement | null,
): boolean {
    if (!target || !panelEl || !(target instanceof Node)) return false;
    return panelEl.contains(target);
}

function startedOnDragHandle(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return target.closest("[data-drag-handle]") !== null;
}

export function useGestureDecision({
    panelRef,
    panelScrollRef,
    panelOpen,
}: UseGestureDecisionOptions): {
    decision: RefObject<GestureDecision | null>;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
} {
    const state = useRef<GestureState>({
        startX: 0,
        startY: 0,
        startTime: 0,
        lastY: 0,
        lastTime: 0,
        originTarget: null,
        direction: null,
        target: null,
        scrolledToTop: false,
        active: false,
    });

    const decision = useRef<GestureDecision | null>(null);

    const resolveTarget = useCallback(
        (origin: EventTarget | null): GestureTarget | null => {
            if (startedOnDragHandle(origin)) return null;
            if (panelOpen && isInsidePanel(origin, panelRef.current)) {
                return "panel";
            }
            return "sheet";
        },
        [panelOpen, panelRef],
    );

    const onPointerDown = useCallback(
        (e: React.PointerEvent): void => {
            const now = performance.now();
            state.current = {
                startX: e.clientX,
                startY: e.clientY,
                startTime: now,
                lastY: e.clientY,
                lastTime: now,
                originTarget: e.target,
                direction: null,
                target: null,
                scrolledToTop: false,
                active: true,
            };
            decision.current = null;
        },
        [],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent): void => {
            const s = state.current;
            if (!s.active) return;

            const now = performance.now();
            const dy = e.clientY - s.startY;
            const dx = e.clientX - s.startX;

            if (s.direction === null) {
                if (Math.abs(dy) < LOCK_THRESHOLD && Math.abs(dx) < LOCK_THRESHOLD) return;
                s.direction = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
            }

            if (s.direction === "h") return;
            if (dy <= 0) return;

            if (s.target === null) {
                s.target = resolveTarget(s.originTarget);
                if (s.target === null) {
                    s.active = false;
                    return;
                }
            }

            if (s.target === "panel") {
                const scrollEl = panelScrollRef.current;
                if (scrollEl && scrollEl.scrollTop >= 2) {
                    scrollEl.scrollTop -= dy;
                    return;
                }
                s.scrolledToTop = true;
            }

            const elapsed = now - s.lastTime;
            const velocity = elapsed > 0 ? (e.clientY - s.lastY) / elapsed : 0;
            s.lastY = e.clientY;
            s.lastTime = now;

            decision.current = {
                target: s.target,
                dy,
                velocity,
                dismiss: false,
            };
        },
        [resolveTarget, panelScrollRef],
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent): void => {
            const s = state.current;
            if (!s.active) return;
            s.active = false;

            const dy = e.clientY - s.startY;
            const elapsed = performance.now() - s.startTime;
            const velocity = elapsed > 0 ? dy / elapsed : 0;

            if (s.target === "panel") {
                if (s.scrolledToTop) {
                    decision.current = {
                        target: "panel",
                        dy,
                        velocity,
                        dismiss:
                            dy > window.innerHeight * DISMISS_RATIO ||
                            velocity > VELOCITY_THRESHOLD,
                    };
                } else {
                    decision.current = null;
                }
            } else if (s.target === "sheet") {
                decision.current = {
                    target: "sheet",
                    dy,
                    velocity,
                    dismiss:
                        dy > window.innerHeight * DISMISS_RATIO ||
                        velocity > VELOCITY_THRESHOLD,
                };
            }

            s.direction = null;
            s.target = null;
            s.originTarget = null;
            s.scrolledToTop = false;
        },
        [],
    );

    return {
        decision,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
    };
}
