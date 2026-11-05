"use client";

import { memo, useCallback, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { DownloadItemResponse, type MediaResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { getMediaSubtitle, isAlbum, isPlayable } from "@rockit/shared";
import {
    Check,
    Library,
    ListEnd,
    LoaderCircle,
    Music,
    Play,
    RefreshCw,
    RotateCw,
    Trash2,
} from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ContextMenuContent from "@/components/ui/ContextMenu/Content";
import ContextMenu from "@/components/ui/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ui/ContextMenu/Splitter";
import SubContextMenuContent from "@/components/ui/ContextMenu/SubContextMenu/Content";
import SubContextMenu from "@/components/ui/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ui/ContextMenu/SubContextMenu/Trigger";
import ContextMenuTrigger from "@/components/ui/ContextMenu/Trigger";

function DownloadCoverCard({
    item,
}: {
    item: DownloadItemResponse;
}): JSX.Element {
    const $vocabulary = useVocabulary();
    const [menuCover, setMenuCover] = useState<string | undefined>();
    const [menuTitle, setMenuTitle] = useState<string | undefined>();
    const [menuSubtitle, setMenuSubtitle] = useState<string | undefined>();
    const fetchedMedia = useRef<MediaResponse["media"] | null>(null);

    const pending = useStore(rockIt.downloaderManager.pendingAtom)[
        item.publicId
    ];
    const playlists = useStore(rockIt.playlistManager.playlistsAtom);
    const isCompleted = item.status === "COMPLETED";
    const isFailed = item.status === "FAILED";
    const isRetrying = item.status === "RETRYING";
    const progress = Math.max(0, Math.min(100, item.progress ?? 0));

    const ringColor = isFailed
        ? "var(--theme-destructive)"
        : isRetrying
          ? "var(--theme-warning)"
          : "var(--theme-primary)";
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

    const retryingManual = pending === "retry";
    const handleRetry = (): Promise<void> =>
        rockIt.downloaderManager.runActionAsync(item, "retry");
    const handleDelete = (): Promise<void> =>
        rockIt.downloaderManager.runActionAsync(item, "delete");

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className={`group flex cursor-pointer flex-col gap-2 ${isCompleted ? "" : ""}`}
                    aria-busy={!!pending}
                    onClick={isCompleted && !pending ? handlePlay : undefined}
                >
                    <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="200px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="text-disabled-foreground flex h-full w-full items-center justify-center">
                                <Music size={28} />
                            </div>
                        )}

                        {pending && (
                            <div
                                role="status"
                                className="bg-backdrop/70 text-foreground-strong absolute inset-0 z-10 flex flex-col items-center justify-center gap-2"
                            >
                                <LoaderCircle
                                    size={24}
                                    className="animate-spin"
                                />
                                <span className="text-xs">
                                    {pending === "retry"
                                        ? $vocabulary.DOWNLOADING
                                        : $vocabulary.SAVING}
                                </span>
                            </div>
                        )}
                        {isRetrying && (
                            <div className="bg-backdrop/50 absolute inset-0 flex items-center justify-center">
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
                            <div className="bg-backdrop/50 absolute inset-0 flex items-center justify-center">
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
                                        strokeWidth="4"
                                        className="stroke-subtle-foreground"
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
                                        className={`text-foreground-strong absolute flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                                            retryingManual
                                                ? "bg-hover cursor-not-allowed"
                                                : "bg-backdrop/70 hover:bg-backdrop/90"
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
                                <div className="bg-success text-foreground-strong absolute top-1.5 right-1.5 rounded-full p-1">
                                    <Check size={12} />
                                </div>
                                <div className="bg-backdrop/0 group-hover:bg-backdrop/40 absolute inset-0 flex items-center justify-center opacity-0 transition-all group-hover:opacity-100">
                                    <div className="bg-foreground-strong/20 rounded-full p-3 backdrop-blur-sm">
                                        <Play
                                            size={24}
                                            className="fill-foreground-strong text-foreground-strong"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-foreground-strong truncate text-sm font-medium">
                            {item.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                            {item.subtitle ?? "—"}
                        </p>
                        {!isCompleted && (
                            <p
                                role="status"
                                className="text-muted-foreground text-xs"
                            >
                                {isFailed
                                    ? $vocabulary.ERROR
                                    : `${$vocabulary.DOWNLOADING} · ${Math.round(progress)}%`}
                            </p>
                        )}
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent
                cover={menuCover ?? item.imageUrl ?? undefined}
                title={menuTitle ?? item.name}
                description={menuSubtitle ?? item.subtitle ?? undefined}
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
                        <ContextMenuOption
                            disable={!!pending}
                            onClick={() =>
                                void rockIt.downloaderManager.runActionAsync(
                                    item,
                                    "library"
                                )
                            }
                        >
                            <Library size={16} />
                            <span>{$vocabulary.ADD_TO_LIBRARY}</span>
                        </ContextMenuOption>
                        {playlists.length > 0 && (
                            <SubContextMenu>
                                <SubContextMenuTrigger>
                                    <ListEnd size={16} />
                                    {$vocabulary.ADD_MEDIA_TO_PLAYLIST}
                                </SubContextMenuTrigger>
                                <SubContextMenuContent>
                                    {playlists.map((playlist) => (
                                        <ContextMenuOption
                                            key={playlist.publicId}
                                            disable={!!pending}
                                            onClick={() =>
                                                void rockIt.downloaderManager.runActionAsync(
                                                    item,
                                                    "playlist",
                                                    playlist.publicId
                                                )
                                            }
                                        >
                                            {playlist.name}
                                        </ContextMenuOption>
                                    ))}
                                </SubContextMenuContent>
                            </SubContextMenu>
                        )}
                        <ContextMenuSplitter />
                    </>
                )}
                {(isFailed || isCompleted) && (
                    <ContextMenuOption
                        disable={!!pending}
                        onClick={handleRetry}
                    >
                        <RefreshCw size={16} />
                        <span>
                            {isCompleted
                                ? $vocabulary.REDOWNLOAD
                                : $vocabulary.RETRY}
                        </span>
                    </ContextMenuOption>
                )}
                <ContextMenuOption
                    disable={!!pending || (!isCompleted && !isFailed)}
                    onClick={handleDelete}
                >
                    <Trash2 size={16} />
                    <span>{$vocabulary.DELETE}</span>
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(DownloadCoverCard);
