"use client";

import type { JSX } from "react";
import type { BookmarkResponse } from "@/dto";
import { EQueueType, ERepeatMode, isStation } from "@rockit/shared";
import {
    Bookmark,
    CirclePause,
    CirclePlay,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
} from "lucide-react";
import { getMediaDuration } from "@/models/types/media";
import { useCurrentMedia, usePlaybackStore } from "@/hooks/usePlaybackStore";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Bookmarks from "@/components/Bookmark/Bookmarks";
import BookmarkPopup from "@/components/Footer/BookmarkPopup";
import ListeningHeatmap from "@/components/ListeningHeatmap/ListeningHeatmap";
import {
    useInitialPlayback,
    useQueueManager,
} from "@/components/providers/QueueProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import Slider from "@/components/ui/Slider/Slider";

const ICON_BTN =
    "cursor-pointer text-gray-400 transition-all md:hover:scale-105 md:hover:text-white";
const ACTIVE = "text-(--color-rockit-pink)";

const EMPTY_BOOKMARKS: BookmarkResponse[] = [];

export default function FooterCenter(): JSX.Element {
    const { session, queue } = useInitialPlayback();
    const queueManager = useQueueManager();
    const $currentMedia = useCurrentMedia();
    const showListeningHeatmap = usePlaybackStore(
        rockIt.userManager.showListeningHeatmapAtom,
        session?.showListeningHeatmap ?? true
    );
    const duration =
        usePlaybackStore(
            rockIt.mediaPlayerManager.durationAtom,
            getMediaDuration($currentMedia) ?? 0
        ) ||
        getMediaDuration($currentMedia) ||
        0;
    const $playing = usePlaybackStore(
        rockIt.mediaPlayerManager.playingAtom,
        false
    );
    const $currentTime = usePlaybackStore(
        rockIt.mediaPlayerManager.currentTimeAtom,
        (session?.currentTimeMs ?? 0) / 1000
    );
    const $loading = usePlaybackStore(
        rockIt.mediaPlayerManager.loadingAtom,
        false
    );
    const $queueType = usePlaybackStore(
        rockIt.userManager.queueTypeAtom,
        EQueueType[queue?.queueType ?? session?.queueType ?? "SORTED"]
    );
    const $repeatMode = usePlaybackStore(
        rockIt.userManager.repeatModeAtom,
        ERepeatMode[session?.repeatMode ?? "OFF"]
    );

    const $vocabulary = useVocabulary();
    const $bookmarks = usePlaybackStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom,
        EMPTY_BOOKMARKS
    );
    const $showBookmarkPopup = usePlaybackStore(
        rockIt.bookmarkManager.showPopupAtom,
        false
    );
    const isLiveStation = $currentMedia && isStation($currentMedia);

    if (!$currentMedia) return <div className="hidden w-1/3 md:block" />;

    const RepeatIcon = $repeatMode === ERepeatMode.ONE ? Repeat1 : Repeat;
    const isRepeatActive =
        $repeatMode === ERepeatMode.ONE || $repeatMode === ERepeatMode.ALL;

    const repeatLabel =
        $repeatMode === ERepeatMode.ONE
            ? $vocabulary.REPEAT_ONE
            : $repeatMode === ERepeatMode.ALL
              ? $vocabulary.REPEAT_ALL
              : $vocabulary.NO_REPEAT;

    const bookmarkAtCurrentTime = $bookmarks.find(
        (b): boolean => Math.abs(b.timestamp - ($currentTime ?? 0)) < 0.5
    );

    return (
        <div className="hidden w-1/3 flex-col items-center justify-center space-y-4 md:flex">
            <div className="relative grid grid-cols-7 items-center justify-items-center gap-2">
                {/* Spacer to keep play button centered with 7 items */}
                <div className="h-4.5 w-4.5" />

                <button
                    aria-label={
                        $queueType === EQueueType.RANDOM
                            ? $vocabulary.PLAYER_DISABLE_SHUFFLE
                            : $vocabulary.PLAYER_ENABLE_SHUFFLE
                    }
                    aria-pressed={$queueType === EQueueType.RANDOM}
                    onClick={(): void => rockIt.userManager.toggleRandomQueue()}
                >
                    <Shuffle
                        className={`h-4.5 w-4.5 transition-colors md:hover:scale-105 ${$queueType === EQueueType.RANDOM ? ACTIVE : "text-gray-400"}`}
                    />
                </button>

                <button
                    aria-label={$vocabulary.PREVIOUS_MEDIA}
                    onClick={(): void => queueManager.skipBack()}
                >
                    <SkipBack
                        className={`h-5.5 w-5.5 fill-current ${ICON_BTN}`}
                    />
                </button>

                {$loading ? (
                    <CirclePlay className="h-8 w-8 animate-pulse text-gray-400" />
                ) : (
                    <button
                        aria-label={
                            $playing ? $vocabulary.PAUSE : $vocabulary.PLAY
                        }
                        onClick={(): void =>
                            $playing
                                ? rockIt.mediaPlayerManager.pause()
                                : rockIt.mediaPlayerManager.play()
                        }
                    >
                        {$playing ? (
                            <CirclePause className={`h-8 w-8 ${ICON_BTN}`} />
                        ) : (
                            <CirclePlay className={`h-8 w-8 ${ICON_BTN}`} />
                        )}
                    </button>
                )}

                <button
                    aria-label={$vocabulary.NEXT_MEDIA}
                    onClick={(): void => queueManager.skipForward()}
                >
                    <SkipForward
                        className={`h-5.5 w-5.5 fill-current ${ICON_BTN}`}
                    />
                </button>

                <button
                    aria-label={repeatLabel}
                    aria-pressed={isRepeatActive}
                    onClick={(): void => rockIt.userManager.cycleRepeatMode()}
                >
                    <RepeatIcon
                        className={`h-4.5 w-4.5 transition-colors md:hover:scale-105 ${isRepeatActive ? ACTIVE : "text-gray-400"}`}
                    />
                </button>

                <div className="relative flex items-center justify-center">
                    <button
                        aria-label={$vocabulary.BOOKMARKS}
                        onClick={(): void =>
                            rockIt.bookmarkManager.togglePopup()
                        }
                    >
                        <Bookmark
                            className={`h-5 w-5 transition-all md:hover:scale-105 ${
                                bookmarkAtCurrentTime
                                    ? ""
                                    : "fill-none text-gray-400"
                            }`}
                            style={
                                bookmarkAtCurrentTime
                                    ? {
                                          fill: BOOKMARK_MODE_COLORS[
                                              bookmarkAtCurrentTime.mode
                                          ],
                                          color: BOOKMARK_MODE_COLORS[
                                              bookmarkAtCurrentTime.mode
                                          ],
                                      }
                                    : undefined
                            }
                        />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            {isLiveStation ? (
                <div
                    role="status"
                    className="flex h-7 items-center gap-2 text-xs font-semibold text-pink-400"
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full bg-current ${$playing ? "animate-pulse" : "opacity-40"}`}
                    />
                    {$loading ? $vocabulary.RADIO_LOADING : $vocabulary.LIVE}
                </div>
            ) : (
                <div className="relative flex h-7 w-full items-center space-x-2">
                    <span className="min-w-6 text-xs font-semibold tabular-nums">
                        {getTime($currentTime ?? 0)}
                    </span>
                    <div className="relative flex-1">
                        <div className="absolute inset-x-0 bottom-full pb-1">
                            <div className="relative">
                                {showListeningHeatmap && (
                                    <ListeningHeatmap
                                        publicId={$currentMedia.publicId}
                                        duration={duration}
                                        currentTime={$currentTime ?? 0}
                                    />
                                )}
                                {$showBookmarkPopup && (
                                    <BookmarkPopup
                                        className="absolute inset-x-0 bottom-full z-50 mb-4 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl md:mb-14"
                                        onClose={(): void =>
                                            rockIt.bookmarkManager.hidePopup()
                                        }
                                    />
                                )}
                            </div>
                        </div>
                        <Slider
                            id="default-slider"
                            className="h-1 w-full rounded bg-neutral-700 accent-(--color-rockit-pink)"
                            value={$currentTime}
                            min={0}
                            max={duration || 1}
                            disabled={duration <= 0}
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
                        />
                        {/* Bookmark markers */}
                        <Bookmarks />
                    </div>
                    <span className="min-w-6 text-xs font-semibold tabular-nums">
                        {getTime(duration)}
                    </span>
                </div>
            )}
        </div>
    );
}
