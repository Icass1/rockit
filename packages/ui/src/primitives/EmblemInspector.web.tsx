"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { createMedalViewer } from "@rockit/ui/browser/medalViewer.web";
import { ListeningEmblem } from "@rockit/ui/primitives/ListeningEmblem";
import { useDesignTheme } from "@rockit/ui/theme";
import type { EmblemInspectorProps } from "./EmblemInspector.types";

export function EmblemInspector({
    badge,
    ownerName,
    vocabulary: v,
}: EmblemInspectorProps) {
    const instructionsId = useId();
    const theme = useDesignTheme();
    const stage = useRef<HTMLDivElement>(null);
    const viewer = useRef<ReturnType<typeof createMedalViewer> | null>(null);
    const [open, setOpen] = useState(true);
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
                stage.current.scrollIntoView?.({ block: "nearest" });
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
    }, [badge, ownerName, theme.colors, open]);
    useEffect(() => {
        if (status === "unavailable") {
            viewer.current?.dispose();
            viewer.current = null;
        }
    }, [status]);
    const style = {
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
                style={style}
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
            }}
        >
            <div
                style={{
                    position: "relative",
                    borderRadius: theme.radius.lg,
                    background: theme.colors["medal-stage"],
                    overflow: "hidden",
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
                        height: theme.layout.medalStageHeight,
                        width: "100%",
                        touchAction: "none",
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
                        }}
                    >
                        {
                            <ListeningEmblem
                                variant={badge.visualVariant}
                                league={badge.league}
                                earned={!!badge.earnedAt}
                                size={theme.layout.medalFallbackSize}
                            />
                        }
                        {status === "loading"
                            ? v.MEDAL_3D_LOADING
                            : v.MEDAL_3D_UNAVAILABLE}
                    </div>
                )}
            </div>
            <p
                id={instructionsId}
                style={{
                    color: theme.colors["muted-foreground"],
                    fontSize: theme.typography.caption,
                    margin: 0,
                }}
            >
                {v.MEDAL_3D_HINT}
            </p>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                }}
            >
                {status === "ready" && (
                    <>
                        <button
                            style={style}
                            onClick={() => viewer.current?.front()}
                        >
                            {v.MEDAL_3D_FRONT}
                        </button>
                        <button
                            style={style}
                            onClick={() => viewer.current?.back()}
                        >
                            {v.MEDAL_3D_BACK}
                        </button>
                        <button
                            style={style}
                            onClick={() => viewer.current?.front()}
                        >
                            {v.MEDAL_3D_RESET}
                        </button>
                    </>
                )}
                <button style={style} onClick={() => setOpen(false)}>
                    {v.MEDAL_3D_CLOSE}
                </button>
            </div>
        </section>
    );
}
