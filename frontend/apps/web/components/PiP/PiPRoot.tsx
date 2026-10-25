"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";
import { getPiPLayout } from "@/lib/utils/pipLayout";
import { PiPControls } from "@/components/PiP/PiPControls";
import { PiPCover } from "@/components/PiP/PiPCover";
import { PiPInfo } from "@/components/PiP/PiPInfo";
import { PiPLyrics } from "@/components/PiP/PiPLyrics";
import { PiPProgress } from "@/components/PiP/PiPProgress";
import { PIP_STYLES } from "@/components/PiP/PiPStyles";

interface PiPRootProps {
    pipWindow?: Window | null;
}

export function PiPRoot({ pipWindow }: PiPRootProps): JSX.Element {
    const text = usePiPText();
    const [showLyrics, setShowLyrics] = useState(false);
    const lyricsCloseRef = useRef<HTMLButtonElement>(null);
    const [size, setSize] = useState(() => ({
        width: pipWindow?.innerWidth ?? 320,
        height: pipWindow?.innerHeight ?? 420,
    }));
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const closeLyrics = (): void => {
        setShowLyrics(false);
        pipWindow?.document
            .querySelector<HTMLElement>(".pip-options summary")
            ?.focus();
    };
    useEffect((): void => {
        if (showLyrics && media?.type === "song")
            lyricsCloseRef.current?.focus();
    }, [showLyrics, media?.type]);

    useEffect((): (() => void) | undefined => {
        if (!pipWindow) return;
        const doc = pipWindow.document;
        doc.documentElement.classList.add("rockit-pip-document");
        const style = doc.createElement("style");
        style.dataset.rockitPip = "true";
        style.textContent = PIP_STYLES;
        doc.head.appendChild(style);
        // Observe the viewport, not a body inflated by oversized content.
        const observer = new ResizeObserver((): void => {
            setSize({
                width: pipWindow.innerWidth,
                height: pipWindow.innerHeight,
            });
        });
        observer.observe(doc.documentElement);
        return (): void => {
            observer.disconnect();
            style.remove();
            doc.documentElement.classList.remove("rockit-pip-document");
        };
    }, [pipWindow]);

    const layout = getPiPLayout(size.width, size.height);
    return (
        <div
            className={`pip-root pip-layout--${layout}`}
            data-pip-layout={layout}
        >
            <PiPCover />
            <div className="pip-panel">
                <PiPInfo />
                <PiPControls
                    layout={layout}
                    showLyrics={showLyrics && media?.type === "song"}
                    onToggleLyrics={(): void =>
                        setShowLyrics((previous) => !previous)
                    }
                />
                <PiPProgress />
            </div>
            {showLyrics && media?.type === "song" && (
                <div
                    className="pip-lyrics-region"
                    onKeyDown={(event): void => {
                        if (event.key === "Escape") {
                            event.stopPropagation();
                            closeLyrics();
                        }
                    }}
                >
                    <button
                        ref={lyricsCloseRef}
                        className="pip-lyrics-close pip-controls-icon-btn"
                        type="button"
                        aria-label={text(
                            "PIP_CLOSE_LYRICS",
                            "Close lyrics",
                            "Cerrar letra"
                        )}
                        onClick={closeLyrics}
                    >
                        ×
                    </button>
                    <PiPLyrics key={media.publicId} />
                </div>
            )}
        </div>
    );
}

export default PiPRoot;
