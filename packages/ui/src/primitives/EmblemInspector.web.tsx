"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { createMedalViewer } from "@rockit/ui/browser/medalViewer.web";
import { ListeningEmblem } from "@rockit/ui/primitives/ListeningEmblem";
import { MedalControls } from "@rockit/ui/primitives/MedalControls";
import { useDesignTheme } from "@rockit/ui/theme";
import type { EmblemInspectorProps } from "./EmblemInspector.types";

export function EmblemInspector({
    badge,
    ownerName,
    vocabulary: v,
    fill = false,
    onClose,
}: EmblemInspectorProps) {
    const instructionsId = useId();
    const theme = useDesignTheme();
    const stage = useRef<HTMLDivElement>(null);
    const viewer = useRef<ReturnType<typeof createMedalViewer> | null>(null);
    const [open, setOpen] = useState(true);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
        "loading"
    );
    useEffect(() => {
        if (!open) return;
        let live = true;
        const fail = () => {
            if (live) setStatus("unavailable");
        };
        const load = async () => {
            try {
                if (typeof WebGL2RenderingContext === "undefined")
                    throw new Error("WebGL unavailable");
                const { createMedalViewer } =
                    await import("@rockit/ui/browser/medalViewer.web");
                if (!live || !stage.current) return;
                viewer.current = createMedalViewer(
                    stage.current,
                    badge,
                    ownerName,
                    theme.colors,
                    fail
                );
                setStatus("ready");
                if (fill) stage.current.focus({ preventScroll: true });
                else stage.current.scrollIntoView?.({ block: "nearest" });
            } catch {
                fail();
            }
        };
        void load();
        return () => {
            live = false;
            viewer.current?.dispose();
            viewer.current = null;
        };
    }, [badge, ownerName, theme.colors, open, attempt, fill]);
    useEffect(() => {
        if (status === "unavailable") {
            viewer.current?.dispose();
            viewer.current = null;
        }
    }, [status]);
    const buttonStyle = {
        minHeight: theme.layout.touchTarget,
        paddingInline: theme.spacing.md,
        border: 0,
        borderRadius: theme.radius.full,
        color: theme.colors.foreground,
        background: theme.colors.secondary,
        fontSize: theme.typography.caption,
        cursor: "pointer",
    };
    if (!open)
        return (
            <button
                style={buttonStyle}
                onClick={() => {
                    setStatus("loading");
                    setOpen(true);
                }}
            >
                {v.MEDAL_3D_OPEN}
            </button>
        );
    return (
        <section
            data-testid="emblem-inspector"
            aria-label={v.MEDAL_3D_LABEL}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.sm,
                ...(fill ? { height: "100%", minHeight: 0 } : {}),
            }}
        >
            <div
                style={{
                    position: "relative",
                    borderRadius: theme.radius.lg,
                    background: theme.colors["medal-stage"],
                    overflow: "hidden",
                    ...(fill ? { flex: 1, minHeight: 0 } : {}),
                }}
            >
                <div
                    ref={stage}
                    data-testid="medal-stage"
                    tabIndex={status === "ready" ? 0 : -1}
                    role="group"
                    aria-label={v.MEDAL_3D_LABEL}
                    aria-describedby={instructionsId}
                    onKeyDown={(event) => {
                        const turns: Record<string, [number, number]> = {
                            ArrowLeft: [-0.15, 0],
                            ArrowRight: [0.15, 0],
                            ArrowUp: [0, -0.15],
                            ArrowDown: [0, 0.15],
                        };
                        const turn = turns[event.key];
                        if (turn) {
                            event.preventDefault();
                            event.stopPropagation();
                            viewer.current?.rotate(...turn);
                        }
                    }}
                    style={{
                        ...(fill
                            ? ({ position: "absolute", inset: 0 } as const)
                            : {}),
                        height: fill ? "100%" : theme.layout.medalStageHeight,
                        width: "100%",
                        touchAction: "none",
                        overscrollBehavior: "contain",
                        userSelect: "none",
                    }}
                />
                {status !== "ready" && (
                    <div
                        role="status"
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: theme.spacing.md,
                            padding: theme.spacing.lg,
                            color: theme.colors["recap-muted"],
                            fontSize: theme.typography.caption,
                            textAlign: "center",
                            pointerEvents: "none",
                        }}
                    >
                        <ListeningEmblem
                            variant={badge.visualVariant}
                            scope={badge.scope}
                            league={badge.league}
                            earned={!!badge.earnedAt}
                            size={theme.layout.medalFallbackSize}
                        />
                        {status === "loading"
                            ? v.MEDAL_3D_LOADING
                            : v.MEDAL_3D_UNAVAILABLE}
                    </div>
                )}

                <MedalControls
                    key={attempt}
                    ready={status === "ready"}
                    vocabulary={v}
                    onFront={() => viewer.current?.front()}
                    onBack={() => viewer.current?.back()}
                    onReset={() => viewer.current?.front()}
                    onRetry={
                        status === "unavailable"
                            ? () => {
                                  setStatus("loading");
                                  setAttempt((n) => n + 1);
                              }
                            : undefined
                    }
                />
            </div>

            <span id={instructionsId} hidden>
                {v.MEDAL_3D_HINT}
            </span>
            {!fill && (
                <button
                    style={buttonStyle}
                    onClick={() => (onClose ? onClose() : setOpen(false))}
                >
                    {v.MEDAL_3D_CLOSE}
                </button>
            )}
        </section>
    );
}
