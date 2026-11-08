"use client";

import { useEffect, type RefObject } from "react";
import { designTokens } from "@rockit/theme";

/** Each lyric view owns its clock and cancellation, including a separate PiP window. */
export function useLyricAutoScroll(
    ref: RefObject<HTMLDivElement | null>,
    selector: string | null
): void {
    useEffect(() => {
        const container = ref.current;
        const line = selector
            ? container?.querySelector<HTMLElement>(selector)
            : null;
        const view = container?.ownerDocument.defaultView;
        if (!container || !line || !view) return;
        let frame = 0;
        let running = false;
        const motion = view.matchMedia("(prefers-reduced-motion: reduce)");
        const target = (): number =>
            Math.max(
                0,
                Math.min(
                    container.scrollHeight - container.clientHeight,
                    line.offsetTop +
                        line.offsetHeight / 2 -
                        container.clientHeight / 2
                )
            );
        const start = (): void => {
            if (running) return;
            if (motion.matches) {
                container.scrollTop = target();
                return;
            }
            const from = container.scrollTop,
                began = view.performance.now();
            running = true;
            const tick = (now: number): void => {
                const progress = Math.min(
                    1,
                    Math.max(
                        0,
                        (now - began) / designTokens.motion.lyricsScroll
                    )
                );
                const eased = progress * progress * (3 - 2 * progress);
                container.scrollTop = from + (target() - from) * eased;
                if (progress < 1) frame = view.requestAnimationFrame(tick);
                else running = false;
            };
            frame = view.requestAnimationFrame(tick);
        };
        const changedMotion = (): void => {
            view.cancelAnimationFrame(frame);
            running = false;
            start();
        };
        const resize = new view.ResizeObserver(start);
        resize.observe(container);
        resize.observe(line);
        motion.addEventListener("change", changedMotion);
        start();
        return () => {
            view.cancelAnimationFrame(frame);
            resize.disconnect();
            motion.removeEventListener("change", changedMotion);
        };
    }, [ref, selector]);
}
