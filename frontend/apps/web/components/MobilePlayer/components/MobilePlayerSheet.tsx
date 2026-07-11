"use client";

import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";
import { getMediaArtistsString } from "@rockit/shared";
import { ChevronDown } from "lucide-react";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import BottomPanel from "@/components/MobilePlayer/components/BottomPanel";
import LikeButton from "@/components/LikeButton/LikeButton";
import PlayerControlsRow from "@/components/MobilePlayer/components/PlayerControlsRow";
import PlayerCoverArt from "@/components/MobilePlayer/components/PlayerCoverArt";
import PlayerProgressBar from "@/components/MobilePlayer/components/PlayerProgressBar";
import { useSheetGesture } from "@/components/MobilePlayer/hooks/useSheetGesture";

type Tab = "queue" | "lyrics" | null;

export default function MobilePlayerSheet(): JSX.Element | null {
    const { currentMedia, isPlayerVisible, hidePlayer, seekTo } = usePlayer();
    const { currentTime } = usePlayerTime();
    const [tab, setTab] = useState<Tab>(null);

    const sheetRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const dismissPanel = useCallback(() => setTab(null), []);

    const gesture = useSheetGesture({
        sheetRef,
        backdropRef,
        panelRef,
        panelScrollRef: scrollRef,
        panelOpen: tab !== null,
        onDismissSheet: hidePlayer,
        onDismissPanel: dismissPanel,
    });

    if (!isPlayerVisible) return null;

    return (
        <div
            ref={sheetRef}
            className="animate-sheet-enter fixed inset-0 z-50 flex flex-col bg-(--color-bg)"
            onPointerDown={gesture.onPointerDown}
            onPointerMove={gesture.onPointerMove}
            onPointerUp={gesture.onPointerUp}
            onPointerCancel={gesture.onPointerCancel}
        >
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="pointer-events-none absolute inset-0"
                aria-hidden
            >
                {currentMedia?.imageUrl && (
                    <div
                        className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl"
                        style={{
                            backgroundImage: `url(${currentMedia.imageUrl})`,
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-black/90" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex touch-none items-center justify-between px-4 py-2">
                <button
                    type="button"
                    onClick={hidePlayer}
                    className="flex h-11 w-11 items-center justify-center"
                    aria-label="Cerrar reproductor"
                >
                    <ChevronDown size={28} color="white" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/logo-banner.png"
                    alt="rockit"
                    className="h-14 object-contain"
                />
                <div className="w-11" />
            </div>

            {/* Player content */}
            <div className="relative z-10 flex flex-1 flex-col justify-center gap-3 overflow-hidden px-4 pb-5">
                <PlayerCoverArt
                    uri={currentMedia?.imageUrl}
                    mediaType={currentMedia?.type}
                />

                <div className="flex items-center gap-2 px-1 pt-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xl font-bold text-white">
                            {currentMedia?.name ?? ""}
                        </p>
                        <p className="truncate text-sm font-medium text-white/70">
                            {getMediaArtistsString(currentMedia)}
                        </p>
                    </div>
                    {currentMedia?.publicId && (
                        <LikeButton mediaPublicId={currentMedia.publicId} />
                    )}
                </div>

                <PlayerProgressBar onSeek={seekTo} />
                <PlayerControlsRow />

                <div className="mt-2 flex justify-center gap-3">
                    {(["queue", "lyrics"] as const).map((key: Tab) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() =>
                                setTab((prev: Tab) =>
                                    prev === key ? null : key,
                                )
                            }
                            className={`rounded-lg px-5 py-2 text-lg font-bold ${
                                tab === key
                                    ? "bg-(--color-rockit-pink)/15 text-(--color-rockit-pink)"
                                    : "text-white"
                            }`}
                        >
                            {key === "queue" ? "Cola" : "Letra"}
                        </button>
                    ))}
                </div>
            </div>

            <BottomPanel
                panelRef={panelRef}
                scrollRef={scrollRef}
                tab={tab}
                onClose={dismissPanel}
                currentTime={currentTime}
                onSeek={seekTo}
                mediaPublicId={currentMedia?.publicId}
            />
        </div>
    );
}
