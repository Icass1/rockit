"use client";

import type { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { EQueueType } from "@rockit/shared";
import { Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { getMediaArtists } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Bookmarks from "@/components/Bookmark/Bookmarks";

export default function MiniPlayer(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const duration = useStore(rockIt.mediaPlayerManager.durationAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $queueType = useStore(rockIt.userManager.queueTypeAtom);

    const hasMedia = Boolean($currentMedia || $currentStation);

    return (
        <div
            className={`fixed right-0 left-0 z-30 flex flex-col transition-all md:hidden ${
                hasMedia
                    ? "bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] opacity-100"
                    : "pointer-events-none bottom-0 opacity-0"
            }`}
        >
            {$currentMedia && (
                <>
                    <div className="bg-secondary/95 flex h-7 items-center gap-1 px-2">
                        <span className="text-muted-foreground w-8 text-[10px] tabular-nums">
                            {getTime($currentTime ?? 0)}
                        </span>
                        <div className="bg-accent relative h-1 flex-1 rounded-full">
                            <div
                                className="from-primary to-brand-light absolute top-0 left-0 h-full rounded-full bg-linear-to-r"
                                style={{
                                    width: `${Math.min(100, Math.max(0, (($currentTime ?? 0) / (duration || 1)) * 100))}%`,
                                }}
                            />
                            {/* Bookmark markers */}
                            <Bookmarks />
                            <input
                                type="range"
                                min={0}
                                max={duration || 1}
                                disabled={duration <= 0}
                                step={0.001}
                                value={$currentTime ?? 0}
                                onChange={(e): void =>
                                    rockIt.mediaPlayerManager.setCurrentTime(
                                        Number(e.target.value),
                                        false
                                    )
                                }
                                onPointerDown={(): void =>
                                    rockIt.mediaPlayerManager.beginSeek()
                                }
                                onPointerUp={(e): void =>
                                    rockIt.mediaPlayerManager.endSeek(
                                        Number(e.currentTarget.value)
                                    )
                                }
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                        </div>
                        <span className="text-muted-foreground w-8 text-right text-[10px] tabular-nums">
                            {getTime(duration)}
                        </span>
                    </div>

                    <div className="border-border-subtle bg-secondary/95 flex h-14 items-center gap-2 border-t px-2 backdrop-blur-md">
                        <Image
                            width={36}
                            height={36}
                            src={$currentMedia.imageUrl}
                            alt={$currentMedia.name}
                            className="h-9 w-9 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-foreground-strong truncate text-sm leading-tight font-semibold">
                                {$currentMedia.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs leading-tight">
                                {getMediaArtists($currentMedia)
                                    ?.map((a): string => a.name)
                                    .join(", ") ?? ""}
                            </p>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={(): void =>
                                    rockIt.userManager.toggleRandomQueue()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                <Shuffle
                                    className={`h-5 w-5 ${$queueType === EQueueType.RANDOM ? "text-primary" : "text-muted-foreground"}`}
                                />
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.queueManager.skipBack()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                <SkipBack className="text-muted-foreground h-5 w-5 fill-current" />
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.mediaPlayerManager.togglePlayPause()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                {$playing ? (
                                    <Pause className="text-foreground-strong h-5 w-5 fill-current" />
                                ) : (
                                    <Play className="text-foreground-strong h-5 w-5 fill-current" />
                                )}
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.queueManager.skipForward()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                <SkipForward className="text-muted-foreground h-5 w-5 fill-current" />
                            </button>
                        </div>
                    </div>
                </>
            )}
            {$currentStation && !$currentMedia && (
                <>
                    <div className="bg-secondary/95 flex h-7 items-center px-2" />

                    <div className="border-border-subtle bg-secondary/95 flex h-14 items-center gap-2 border-t px-2 backdrop-blur-md">
                        <Image
                            width={36}
                            height={36}
                            src={$currentStation.imageUrl}
                            alt={$currentStation.name}
                            className="h-9 w-9 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-foreground-strong truncate text-sm leading-tight font-semibold">
                                {$currentStation.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs leading-tight">
                                {$currentStation.country}
                            </p>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={(): void =>
                                    rockIt.mediaPlayerManager.togglePlayPause()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                {$playing ? (
                                    <Pause className="text-foreground-strong h-5 w-5 fill-current" />
                                ) : (
                                    <Play className="text-foreground-strong h-5 w-5 fill-current" />
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
