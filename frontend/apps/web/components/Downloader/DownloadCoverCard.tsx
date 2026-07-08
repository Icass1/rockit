"use client";

import { useCallback, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { DownloadItemResponse, type MediaResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { getMediaSubtitle, isAlbum, isPlayable } from "@rockit/shared";
import {
    Check,
    ListEnd,
    Music,
    Play,
    RefreshCw,
    RotateCw,
    Trash2,
} from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";

export default function DownloadCoverCard({
    item,
}: {
    item: DownloadItemResponse;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [menuCover, setMenuCover] = useState<string | undefined>();
    const [menuTitle, setMenuTitle] = useState<string | undefined>();
    const [menuSubtitle, setMenuSubtitle] = useState<string | undefined>();
    const fetchedMedia = useRef<MediaResponse["media"] | null>(null);

    const isCompleted = item.status === "COMPLETED";
    const isFailed = item.status === "FAILED";
    const isRetrying = item.status === "RETRYING";
    const progress = Math.max(0, Math.min(100, item.progress ?? 0));

    const ringColor = isFailed ? "#c72e2e" : isRetrying ? "#fbbf24" : "#ee1086";
    const circumference = 2 * Math.PI * 18;
    const dashOffset = circumference - (progress / 100) * circumference;

    const fetchMediaAsync = useCallback(async (): Promise<
        MediaResponse["media"] | null
    > => {
        if (fetchedMedia.current) return fetchedMedia.current;
        const response = await Http.getMediaAsync(item.mediaPublicId);
        if (response.isOk()) {
            const media = response.result.media;
            setMenuCover(media.imageUrl ?? item.imageUrl ?? undefined);
            setMenuTitle(media.name ?? item.name);
            setMenuSubtitle(
                getMediaSubtitle(media) ?? item.subtitle ?? undefined
            );
            fetchedMedia.current = media;
            return media;
        }
        return null;
    }, [item.mediaPublicId, item.imageUrl, item.name, item.subtitle]);

    const handlePlay = useCallback(async (): Promise<void> => {
        const media = await fetchMediaAsync();
        if (!media) return;
        if (isPlayable(media)) {
            rockIt.queueManager.setMedia([media], media.publicId);
            rockIt.queueManager.moveToMedia(media.publicId);
            rockIt.mediaPlayerManager.play();
        } else if (isAlbum(media)) {
            rockIt.queueManager.playList(media);
        }
    }, [fetchMediaAsync]);

    const handleAddToQueue = useCallback(async (): Promise<void> => {
        const media = await fetchMediaAsync();
        if (!media) return;
        if (isPlayable(media)) {
            rockIt.queueManager.addMediaToEnd(media);
        }
    }, [fetchMediaAsync]);

    const [retryingManual, setRetryingManual] = useState<boolean>(false);

    const handleRetry = useCallback(async (): Promise<void> => {
        setRetryingManual(true);
        try {
            await Http.retryDownload(item.mediaPublicId);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : $vocabulary.DOWNLOADER_RETRY_ERROR;
            rockIt.notificationManager.notifyError(message);
        } finally {
            setRetryingManual(false);
        }
    }, [item.mediaPublicId, $vocabulary.DOWNLOADER_RETRY_ERROR]);

    const handleDelete = useCallback((): void => {
        console.warn("Delete not yet implemented for", item.mediaPublicId);
    }, [item.mediaPublicId]);

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className={`group flex cursor-pointer flex-col gap-2 ${isCompleted ? "" : ""}`}
                    onClick={isCompleted ? handlePlay : undefined}
                >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="200px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-600">
                                <Music size={28} />
                            </div>
                        )}

                        {isRetrying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="flex flex-col items-center gap-1">
                                    <RotateCw
                                        size={20}
                                        strokeWidth={2.25}
                                        className="animate-spin text-(--color-warning)"
                                    />
                                    <span className="text-[10px] font-medium text-(--color-warning)">
                                        ({item.retryCount ?? 0}/3)
                                    </span>
                                </div>
                            </div>
                        )}
                        {!isCompleted && !isRetrying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <svg
                                    width="44"
                                    height="44"
                                    viewBox="0 0 44 44"
                                    className="-rotate-90"
                                >
                                    <circle
                                        cx="22"
                                        cy="22"
                                        r="18"
                                        fill="none"
                                        stroke="#737373"
                                        strokeWidth="4"
                                    />
                                    <circle
                                        cx="22"
                                        cy="22"
                                        r="18"
                                        fill="none"
                                        stroke={ringColor}
                                        strokeWidth="4"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {isFailed && (
                                    <button
                                        aria-label={
                                            $vocabulary.DOWNLOADER_RETRY_ARIA
                                        }
                                        disabled={retryingManual}
                                        className={`absolute flex h-9 w-9 items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors ${
                                            retryingManual
                                                ? "cursor-not-allowed bg-neutral-600"
                                                : "bg-black/70 hover:bg-black/90"
                                        }`}
                                        onClick={(e): void => {
                                            e.stopPropagation();
                                            handleRetry();
                                        }}
                                    >
                                        <RotateCw
                                            size={18}
                                            strokeWidth={2.25}
                                            className={
                                                retryingManual
                                                    ? "animate-spin"
                                                    : ""
                                            }
                                        />
                                    </button>
                                )}
                            </div>
                        )}

                        {isCompleted && (
                            <>
                                <div className="absolute top-1.5 right-1.5 rounded-full bg-(--color-success) p-1 text-white">
                                    <Check size={12} />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                                        <Play
                                            size={24}
                                            className="fill-white text-white"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                            {item.name}
                        </p>
                        <p className="truncate text-xs text-neutral-400">
                            {item.subtitle ?? "—"}
                        </p>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent
                cover={menuCover}
                title={menuTitle}
                description={menuSubtitle}
            >
                {isCompleted && (
                    <>
                        <ContextMenuOption onClick={handlePlay}>
                            <Play size={16} />
                            <span>{$vocabulary.PLAY}</span>
                        </ContextMenuOption>
                        <ContextMenuOption onClick={handleAddToQueue}>
                            <ListEnd size={16} />
                            <span>{$vocabulary.ADD_TO_QUEUE}</span>
                        </ContextMenuOption>
                        <ContextMenuSplitter />
                    </>
                )}
                {isFailed && (
                    <ContextMenuOption onClick={handleRetry}>
                        <RefreshCw size={16} />
                        <span>{$vocabulary.RETRY}</span>
                    </ContextMenuOption>
                )}
                <ContextMenuOption onClick={handleDelete}>
                    <Trash2 size={16} />
                    <span>{$vocabulary.DELETE}</span>
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
