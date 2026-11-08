"use client";

import { useEffect, useState, type CSSProperties, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { usePiPLyrics } from "@/hooks/usePiPLyrics";
import { rockIt } from "@/lib/rockit/rockIt";
import { getPiPLayout } from "@/lib/utils/pipLayout";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";
import { PiPControls } from "@/components/PiP/PiPControls";
import { PiPCover } from "@/components/PiP/PiPCover";
import { PiPHeader } from "@/components/PiP/PiPHeader";
import { PiPInfo } from "@/components/PiP/PiPInfo";
import { PiPLyrics } from "@/components/PiP/PiPLyrics";
import { PiPProgress } from "@/components/PiP/PiPProgress";
import { PiPRetro } from "@/components/PiP/PiPRetro";
import { PIP_STYLES } from "@/components/PiP/PiPStyles";

interface PiPRootProps {
    pipWindow?: Window | null;
}

export function PiPRoot({ pipWindow }: PiPRootProps): JSX.Element {
    const [retro, setRetro] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [size, setSize] = useState(() => ({
        width: pipWindow?.innerWidth ?? 320,
        height: pipWindow?.innerHeight ?? 420,
    }));
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const { hex: coverColor } = parseDominantColor(
        media && "dominantColor" in media ? media.dominantColor : undefined
    );
    const theme = { "--pip-cover-color": coverColor } as CSSProperties;
    const lyrics = usePiPLyrics(
        media?.type === "song" ? media.publicId : undefined,
        showLyrics
    );
    const lyricsVisible = showLyrics && media?.type === "song";
    useEffect((): (() => void) | undefined => {
        if (!pipWindow) return;
        const doc = pipWindow.document;
        doc.documentElement.classList.add("rockit-pip-document");
        const syncTheme = (): void => {
            doc.documentElement.setAttribute(
                "data-theme",
                document.documentElement.dataset.theme ?? "dark"
            );
        };
        syncTheme();
        const themeObserver = new MutationObserver(syncTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });
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
            themeObserver.disconnect();
            style.remove();
            doc.documentElement.classList.remove("rockit-pip-document");
        };
    }, [pipWindow]);

    const layout = getPiPLayout(size.width, size.height);
    const retroEligible =
        size.width >= 220 &&
        size.height >= 380 &&
        size.height > size.width * 1.1;
    const retroVisible = retro && retroEligible;
    return (
        <div
            className={[
                "pip-root",
                retroVisible ? "pip-is-retro" : "",
                `pip-layout--${layout}`,
                lyricsVisible ? "pip-has-lyrics" : "",
            ].join(" ")}
            onKeyDown={(event): void => {
                if (event.key === "Escape" && lyricsVisible) {
                    setShowLyrics(false);
                    pipWindow?.document
                        .querySelector<HTMLButtonElement>(".pip-lyrics-toggle")
                        ?.focus();
                }
            }}
            style={theme}
            data-pip-layout={layout}
        >
            <PiPHeader
                pipWindow={pipWindow}
                retro={retroVisible}
                onToggleRetro={
                    retroEligible
                        ? () => setRetro((value) => !value)
                        : undefined
                }
            />
            {retroVisible ? (
                <PiPRetro
                    lyrics={lyrics}
                    showLyrics={lyricsVisible}
                    onToggleLyrics={() => setShowLyrics((value) => !value)}
                />
            ) : (
                <>
                    <div className="pip-stage">
                        <PiPCover />
                        {lyricsVisible && <PiPLyrics {...lyrics} />}
                    </div>
                    <div className="pip-panel">
                        <PiPInfo>
                            {lyricsVisible && <PiPLyrics {...lyrics} glance />}
                        </PiPInfo>
                        <PiPControls
                            layout={layout}
                            showLyrics={showLyrics && media?.type === "song"}
                            onToggleLyrics={(): void =>
                                setShowLyrics((previous) => !previous)
                            }
                        />
                        <PiPProgress />
                    </div>
                </>
            )}
        </div>
    );
}

export default PiPRoot;
