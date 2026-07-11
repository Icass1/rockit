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
    active: boolean;
}

export interface GestureDecision {
    target: GestureTarget;
    dy: number;
    velocity: number;
    dismiss: boolean;
}

interface UseGestureDecisionOptions {
    panelOpen: boolean;
}

function startedOnPanelHandle(
    target: EventTarget | null,
): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return target.closest("[data-panel-handle]") !== null;
}

export function useGestureDecision({
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
        active: false,
    });

    const decision = useRef<GestureDecision | null>(null);

    const resolveTarget = useCallback(
        (origin: EventTarget | null): GestureTarget => {
            if (!panelOpen) return "sheet";
            if (startedOnPanelHandle(origin)) return "panel";
            return "sheet";
        },
        [panelOpen],
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
        [resolveTarget],
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent): void => {
            const s = state.current;
            if (!s.active) return;
            s.active = false;

            const dy = e.clientY - s.startY;
            const elapsed = performance.now() - s.startTime;
            const velocity = elapsed > 0 ? dy / elapsed : 0;

            decision.current = {
                target: s.target ?? "sheet",
                dy,
                velocity,
                dismiss:
                    dy > window.innerHeight * DISMISS_RATIO ||
                    velocity > VELOCITY_THRESHOLD,
            };

            s.direction = null;
            s.target = null;
            s.originTarget = null;
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
