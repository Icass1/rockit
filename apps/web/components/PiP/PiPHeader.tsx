"use client";

import { useRef, type JSX } from "react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

/** Window movement remains subject to the browser's auxiliary-window policy. */
export function PiPHeader({
    pipWindow,
}: {
    pipWindow?: Window | null;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const lastPointer = useRef({ x: 0, y: 0 });
    const move = (x: number, y: number): void => {
        try {
            pipWindow?.moveBy(x, y);
        } catch {
            /* Browser may own positioning. */
        }
    };
    return (
        <div className="pip-header">
            <button
                type="button"
                className="pip-close"
                aria-label={vocabulary.MOBILE_CLOSE}
                title={vocabulary.MOBILE_CLOSE}
                onClick={() => pipWindow?.close()}
            >
                <span />
            </button>
            <button
                type="button"
                className="pip-grip"
                aria-label={vocabulary.PIP_MOVE_WINDOW}
                title={vocabulary.PIP_MOVE_WINDOW}
                onPointerDown={(event) => {
                    lastPointer.current = {
                        x: event.screenX,
                        y: event.screenY,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId))
                        return;
                    move(
                        event.screenX - lastPointer.current.x,
                        event.screenY - lastPointer.current.y
                    );
                    lastPointer.current = {
                        x: event.screenX,
                        y: event.screenY,
                    };
                }}
                onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(
                            event.pointerId
                        );
                }}
                onKeyDown={(event) => {
                    const delta = {
                        ArrowLeft: [-10, 0],
                        ArrowRight: [10, 0],
                        ArrowUp: [0, -10],
                        ArrowDown: [0, 10],
                    }[event.key];
                    if (delta) {
                        event.preventDefault();
                        move(delta[0], delta[1]);
                    }
                }}
            >
                <span className="pip-grip-dots" aria-hidden>
                    {Array.from({ length: 8 }, (_, index) => (
                        <span key={index} />
                    ))}
                </span>
            </button>
        </div>
    );
}
