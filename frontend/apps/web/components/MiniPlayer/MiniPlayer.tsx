"use client";

import type { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { EQueueType } from "@rockit/packages/shared";
import { Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { getMediaArtists, getMediaDuration } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

export default function MiniPlayer(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $queueType = useStore(rockIt.userManager.queueTypeAtom);

    const hasMedia = Boolean($currentMedia || $currentStation);

    return (
        <div
            className={`fixed right-0 left-0 z-30 flex flex-col transition-all md:hidden ${
                hasMedia
                    ? "bottom-14 opacity-100"
                    : "pointer-events-none bottom-0 opacity-0"
            }`}
        >
            {$currentMedia && (
                <>
                    <div className="flex h-7 items-center gap-1 bg-[#1a1a1a]/95 px-2">
                        <span className="w-8 text-[10px] text-neutral-400 tabular-nums">
                            {getTime($currentTime ?? 0)}
                        </span>
                        <div className="relative h-1 flex-1 rounded-full bg-neutral-700">
                            <div
                                className="absolute top-0 left-0 h-full rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467]"
                                style={{
                                    width: `${Math.min(100, Math.max(0, (($currentTime ?? 0) / (getMediaDuration($currentMedia) ?? 1)) * 100))}%`,
                                }}
                            />
                            <input
                                type="range"
                                min={0}
                                max={getMediaDuration($currentMedia) ?? 100}
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
                        <span className="w-8 text-right text-[10px] text-neutral-400 tabular-nums">
                            {getTime(getMediaDuration($currentMedia) ?? 0)}
                        </span>
                    </div>

                    <div className="flex h-14 items-center gap-2 border-t border-neutral-800 bg-[#1a1a1a]/95 px-2 backdrop-blur-md">
                        <Image
                            width={36}
                            height={36}
                            src={$currentMedia.imageUrl}
                            alt={$currentMedia.name}
                            className="h-9 w-9 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm leading-tight font-semibold text-white">
                                {$currentMedia.name}
                            </p>
                            <p className="truncate text-xs leading-tight text-neutral-400">
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
                                    className={`h-5 w-5 ${$queueType === EQueueType.RANDOM ? "text-[#ee1086]" : "text-neutral-400"}`}
                                />
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.queueManager.skipBack()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                <SkipBack className="h-5 w-5 fill-current text-neutral-400" />
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.mediaPlayerManager.togglePlayPause()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                {$playing ? (
                                    <Pause className="h-5 w-5 fill-current text-white" />
                                ) : (
                                    <Play className="h-5 w-5 fill-current text-white" />
                                )}
                            </button>
                            <button
                                onClick={(): void =>
                                    rockIt.queueManager.skipForward()
                                }
                                className="flex h-9 w-9 items-center justify-center"
                            >
                                <SkipForward className="h-5 w-5 fill-current text-neutral-400" />
                            </button>
                        </div>
                    </div>
                </>
            )}
            {$currentStation && !$currentMedia && (
                <>
                    <div className="flex h-7 items-center bg-[#1a1a1a]/95 px-2" />

                    <div className="flex h-14 items-center gap-2 border-t border-neutral-800 bg-[#1a1a1a]/95 px-2 backdrop-blur-md">
                        <Image
                            width={36}
                            height={36}
                            src={$currentStation.favicon}
                            alt={$currentStation.name}
                            className="h-9 w-9 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm leading-tight font-semibold text-white">
                                {$currentStation.name}
                            </p>
                            <p className="truncate text-xs leading-tight text-neutral-400">
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
                                    <Pause className="h-5 w-5 fill-current text-white" />
                                ) : (
                                    <Play className="h-5 w-5 fill-current text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
