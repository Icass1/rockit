"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { EQueueType, ERepeatMode, isStation } from "@rockit/packages/shared";
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
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Bookmarks from "@/components/Bookmark/Bookmarks";
import BookmarkPopup from "@/components/Footer/BookmarkPopup";
import Slider from "@/components/Slider/Slider";

const ICON_BTN =
    "cursor-pointer text-gray-400 transition-all md:hover:scale-105 md:hover:text-white";
const ACTIVE = "text-(--color-rockit-pink)";

export default function FooterCenter(): JSX.Element {
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $loading = useStore(rockIt.mediaPlayerManager.loadingAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $queueType = useStore(rockIt.userManager.queueTypeAtom);
    const $repeatMode = useStore(rockIt.userManager.repeatModeAtom);

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const $showBookmarkPopup = useStore(rockIt.bookmarkManager.showPopupAtom);
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
        <div className="hidden w-1/3 flex-col items-center justify-center space-y-1 md:flex">
            <div className="relative grid grid-cols-7 items-center justify-items-center gap-2">
                {/* Spacer to keep play button centered with 7 items */}
                <div className="h-4.5 w-4.5" />

                <button
                    aria-label={
                        $queueType ? "Disable shuffle" : "Enable shuffle"
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
                    onClick={(): void => rockIt.queueManager.skipBack()}
                >
                    <SkipBack
                        className={`h-5.5 w-5.5 fill-current ${ICON_BTN}`}
                    />
                </button>

                {$loading ? (
                    <CirclePlay className="h-8 w-8 animate-pulse text-gray-400" />
                ) : (
                    <button
                        aria-label={$playing ? "Pause" : "Play"}
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
                    onClick={(): void => rockIt.queueManager.skipForward()}
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
                        aria-label="Bookmark"
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
                    {$showBookmarkPopup && (
                        <BookmarkPopup
                            onClose={(): void =>
                                rockIt.bookmarkManager.hidePopup()
                            }
                        />
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative flex h-7 w-full items-center space-x-2">
                <span className="min-w-6 text-xs font-semibold tabular-nums">
                    {getTime($currentTime ?? 0)}
                </span>
                <div className="relative flex-1">
                    <Slider
                        id="default-slider"
                        className="h-1 w-full rounded bg-neutral-700 accent-(--color-rockit-pink)"
                        value={$currentTime}
                        min={0}
                        max={
                            isLiveStation
                                ? 3600
                                : getMediaDuration($currentMedia)
                        }
                        onChange={
                            isLiveStation
                                ? undefined
                                : (e): void =>
                                      rockIt.mediaPlayerManager.setCurrentTime(
                                          Number(e.target.value),
                                          false
                                      )
                        }
                        onPointerDown={
                            isLiveStation
                                ? undefined
                                : (): void =>
                                      rockIt.mediaPlayerManager.beginSeek()
                        }
                        onPointerUp={
                            isLiveStation
                                ? undefined
                                : (e): void =>
                                      rockIt.mediaPlayerManager.endSeek(
                                          Number(e.currentTarget.value)
                                      )
                        }
                    />
                    {/* Bookmark markers */}
                    <Bookmarks />
                </div>
                <span className="min-w-6 text-xs font-semibold tabular-nums">
                    {getTime(
                        isLiveStation
                            ? ($currentTime ?? 0)
                            : (getMediaDuration($currentMedia) ?? 0)
                    )}
                </span>
            </div>
        </div>
    );
}
