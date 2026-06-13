"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { PiPCover } from "@/components/PiP/PiPCover";
import { PiPInfo } from "@/components/PiP/PiPInfo";
import { PiPLyrics } from "@/components/PiP/PiPLyrics";
import { PIP_STYLES } from "@/components/PiP/PiPStyles";

export type PiPLayout = "cover-only" | "sidebar" | "pill" | "full";

function getLayout(width: number, height: number): PiPLayout {
    if (width < 260 || (width < 300 && height < 250)) return "cover-only";
    const ratio = width / height;
    if (ratio > 1.7 && height < 220) return "pill";
    if (width >= 400 && height >= 300) return "full";
    return "sidebar";
}

function applyCssVars(doc: Document, layout: PiPLayout): void {
    const root = doc.documentElement;

    const vars: Record<string, string> = {};

    switch (layout) {
        case "cover-only":
            vars["--pip-cover-radius"] = "0";
            vars["--pip-gap"] = "0";
            vars["--pip-padding"] = "0";
            vars["--pip-font-size-title"] = "0";
            vars["--pip-font-size-artist"] = "0";
            vars["--pip-icon-size"] = "11px";
            vars["--pip-icon-min"] = "10px";
            vars["--pip-icon-max"] = "14px";
            vars["--pip-play-icon-size"] = "16px";
            vars["--pip-play-icon-min"] = "14px";
            break;
        case "pill":
            vars["--pip-cover-radius"] = "8px";
            vars["--pip-gap"] = "8px";
            vars["--pip-padding"] = "8px";
            vars["--pip-font-size-title"] = "0.8rem";
            vars["--pip-font-size-artist"] = "0.7rem";
            vars["--pip-icon-size"] = "10px";
            vars["--pip-icon-min"] = "9px";
            vars["--pip-icon-max"] = "12px";
            vars["--pip-play-icon-size"] = "14px";
            vars["--pip-play-icon-min"] = "12px";
            break;
        case "full":
            vars["--pip-cover-radius"] = "8px";
            vars["--pip-gap"] = "8px";
            vars["--pip-padding"] = "8px";
            vars["--pip-font-size-title"] = "0.95rem";
            vars["--pip-font-size-artist"] = "0.8rem";
            vars["--pip-icon-size"] = "2.5vw";
            vars["--pip-icon-min"] = "12px";
            vars["--pip-icon-max"] = "25px";
            vars["--pip-play-icon-size"] = "5vw";
            vars["--pip-play-icon-min"] = "17px";
            break;
        case "sidebar":
        default:
            vars["--pip-cover-radius"] = "8px";
            vars["--pip-gap"] = "8px";
            vars["--pip-padding"] = "8px";
            vars["--pip-font-size-title"] = "0.85rem";
            vars["--pip-font-size-artist"] = "0.75rem";
            vars["--pip-icon-size"] = "2.5vw";
            vars["--pip-icon-min"] = "12px";
            vars["--pip-icon-max"] = "25px";
            vars["--pip-play-icon-size"] = "5vw";
            vars["--pip-play-icon-min"] = "17px";
            break;
    }

    for (const [name, value] of Object.entries(vars)) {
        root.style.setProperty(name, value);
    }
}

interface PiPRootProps {
    pipWindow?: Window | null;
}

export function PiPRoot({ pipWindow }: PiPRootProps): JSX.Element {
    const [hover, setHover] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [size, setSize] = useState({ width: 320, height: 420 });
    const styleInjectedRef = useRef(false);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);

    useEffect(() => {
        const el = pipWindow?.document?.body;
        if (!el) return;

        if (!styleInjectedRef.current) {
            const styleTag = pipWindow.document.createElement("style");
            styleTag.type = "text/css";
            styleTag.appendChild(pipWindow.document.createTextNode(PIP_STYLES));
            pipWindow.document.head.appendChild(styleTag);
            styleInjectedRef.current = true;
        }

        const ro = new ResizeObserver((entries): void => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const layout = getLayout(width, height);

                if (pipWindow) {
                    applyCssVars(pipWindow.document, layout);
                }

                setSize((prev) => {
                    if (
                        Math.abs(prev.width - width) > 1 ||
                        Math.abs(prev.height - height) > 1
                    ) {
                        return { width, height };
                    }
                    return prev;
                });
            }
        });

        ro.observe(el);
        return (): void => {
            ro.disconnect();
        };
    }, [pipWindow]);

    const layout = getLayout(size.width, size.height);

    return (
        <div
            className={`pip-root pip-layout--${layout}`}
            onMouseEnter={(): void => setHover(true)}
            onMouseLeave={(): void => setHover(false)}
        >
            <PiPCover
                showControls={hover}
                layout={layout}
                minimalOverlay={layout === "cover-only" || layout === "pill"}
                showLyrics={showLyrics}
                onToggleLyrics={(): void => setShowLyrics((p) => !p)}
            />

            <PiPInfo />

            {showLyrics && (
                <PiPLyrics key={$currentMedia?.publicId ?? "no-media"} />
            )}
        </div>
    );
}

export default PiPRoot;
