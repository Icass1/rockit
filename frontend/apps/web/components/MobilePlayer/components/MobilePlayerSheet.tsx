"use client";

import type { JSX } from "react";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import LikeButton from "@/components/LikeButton/LikeButton";
import PlayerCoverArt from "@/components/MobilePlayer/components/PlayerCoverArt";
import PlayerControlsRow from "@/components/MobilePlayer/components/PlayerControlsRow";
import PlayerProgressBar from "@/components/MobilePlayer/components/PlayerProgressBar";
import QueuePanel from "@/components/MobilePlayer/components/QueuePanel";
import LyricsPanel from "@/components/MobilePlayer/components/LyricsPanel";

type Tab = "queue" | "lyrics" | null;

export default function MobilePlayerSheet(): JSX.Element | null {
    const { currentMedia, isPlayerVisible, hidePlayer, seekTo } = usePlayer();
    const { currentTime } = usePlayerTime();
    const [tab, setTab] = useState<Tab>(null);

    const sheetRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    if (!isPlayerVisible) return null;

    const handlePointerDown = (e: React.PointerEvent): void => {
        dragStartY.current = e.clientY;
        setIsDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent): void => {
        if (dragStartY.current === null || !sheetRef.current) return;
        const delta = Math.max(0, e.clientY - dragStartY.current);
        sheetRef.current.style.transform = `translateY(${delta}px)`;
    };

    const handlePointerUp = (e: React.PointerEvent): void => {
        if (dragStartY.current === null || !sheetRef.current) return;
        const delta = Math.max(0, e.clientY - dragStartY.current);
        dragStartY.current = null;
        setIsDragging(false);
        const dismiss = delta > window.innerHeight / 3;
        sheetRef.current.style.transform = "";
        if (dismiss) hidePlayer();
    };

    return (
        <div
            ref={sheetRef}
            className={`fixed inset-0 z-50 flex flex-col bg-(--color-bg) ${
                isDragging ? "" : "transition-transform duration-200"
            }`}
        >
            {/* Blurred cover background, CSS-only */}
            {currentMedia?.imageUrl && (
                <div
                    className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl"
                    style={{
                        backgroundImage: `url(${currentMedia.imageUrl})`,
                    }}
                    aria-hidden
                />
            )}
            <div className="absolute inset-0 bg-black/90" aria-hidden />

            {/* Drag handle strip — the ONLY area that closes the sheet */}
            <div
                className="relative z-10 flex items-center justify-between px-4 py-2 touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
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
                            {currentMedia && "artists" in currentMedia
                                ? (currentMedia.artists?.[0]?.name ?? "")
                                : ""}
                        </p>
                    </div>
                    {currentMedia?.publicId && (
                        <LikeButton mediaPublicId={currentMedia.publicId} />
                    )}
                </div>

                <PlayerProgressBar onSeek={seekTo} />
                <PlayerControlsRow />

                {/* Tabs: Queue / Lyrics */}
                <div className="mt-2 flex justify-center gap-3">
                    {(["queue", "lyrics"] as const).map((key: Tab) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() =>
                                setTab((prev: Tab) =>
                                    prev === key ? null : key
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

            {/* Sub-panel: slides up, owns its own scroll/drag territory */}
            <div
                className={`absolute inset-x-0 bottom-0 z-20 h-[65%] rounded-t-2xl bg-neutral-900 transition-transform duration-200 ${
                    tab ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <button
                    type="button"
                    onClick={() => setTab(null)}
                    className="flex w-full items-center justify-center py-2.5"
                    aria-label="Cerrar panel"
                >
                    <span className="h-1 w-9 rounded-full bg-white/25" />
                </button>
                <div className="h-[calc(100%-32px)]">
                    {tab === "queue" && <QueuePanel />}
                    {tab === "lyrics" && (
                        <LyricsPanel
                            key={currentMedia?.publicId}
                            onSeek={seekTo}
                            currentTime={currentTime}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
