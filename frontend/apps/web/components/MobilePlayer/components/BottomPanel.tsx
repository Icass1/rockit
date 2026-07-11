"use client";

import type { JSX } from "react";
import type { RefObject } from "react";
import LyricsPanel from "@/components/MobilePlayer/components/LyricsPanel";
import QueuePanel from "@/components/MobilePlayer/components/QueuePanel";

interface BottomPanelProps {
    panelRef: RefObject<HTMLDivElement | null>;
    scrollRef: RefObject<HTMLDivElement | null>;
    tab: "queue" | "lyrics" | null;
    onClose: () => void;
    currentTime: number;
    onSeek: (seconds: number) => void;
    mediaPublicId: string | undefined;
}

export default function BottomPanel({
    panelRef,
    scrollRef,
    tab,
    onClose,
    currentTime,
    onSeek,
    mediaPublicId,
}: BottomPanelProps): JSX.Element {
    return (
        <div
            ref={panelRef}
            data-bottom-panel
            className={`absolute inset-x-0 bottom-0 z-20 h-[65%] rounded-t-2xl bg-neutral-900 ${
                tab ? "translate-y-0" : "translate-y-full"
            }`}
        >
            <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-center py-2.5"
                aria-label="Cerrar panel"
            >
                <span className="h-1 w-9 rounded-full bg-white/25" />
            </button>
            <div
                ref={scrollRef}
                className="h-[calc(100%-32px)] overflow-y-auto"
                style={{
                    touchAction: tab ? "pan-x" : "auto",
                    overscrollBehavior: "contain",
                }}
            >
                {tab === "queue" && <QueuePanel />}
                {tab === "lyrics" && mediaPublicId && (
                    <LyricsPanel
                        key={mediaPublicId}
                        onSeek={onSeek}
                        currentTime={currentTime}
                    />
                )}
            </div>
        </div>
    );
}
