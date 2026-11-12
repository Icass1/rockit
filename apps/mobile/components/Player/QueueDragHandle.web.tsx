import { useRef, type ReactNode } from "react";
import { useDesignTheme } from "@rockit/ui";

export default function QueueDragHandle({
    label,
    onStart,
    onMove,
    onEnd,
    children,
}: {
    label: string;
    onStart: () => void;
    onMove: (dy: number, y: number) => void;
    onEnd: (dy: number) => void;
    children: ReactNode;
}) {
    const theme = useDesignTheme();
    const start = useRef<number | null>(null);
    return (
        <button
            type="button"
            data-testid="queue-drag-handle"
            aria-label={label}
            style={{
                width: theme.layout.touchTarget,
                height: theme.layout.touchTarget,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: 0,
                padding: 0,
                touchAction: "none",
                cursor: "grab",
                flexShrink: 0,
            }}
            onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                start.current = event.clientY;
                event.currentTarget.setPointerCapture(event.pointerId);
                onStart();
            }}
            onPointerMove={(event) => {
                if (start.current === null) return;
                event.stopPropagation();
                onMove(event.clientY - start.current, event.clientY);
            }}
            onPointerUp={(event) => {
                if (start.current === null) return;
                event.stopPropagation();
                const dy = event.clientY - start.current;
                start.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                onEnd(dy);
            }}
            onPointerCancel={() => {
                if (start.current === null) return;
                start.current = null;
                onEnd(0);
            }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                    return;
                event.preventDefault();
                event.stopPropagation();
                onStart();
                onEnd(
                    event.key === "ArrowUp"
                        ? -theme.layout.queueRowHeight
                        : theme.layout.queueRowHeight
                );
            }}
        >
            {children}
        </button>
    );
}
