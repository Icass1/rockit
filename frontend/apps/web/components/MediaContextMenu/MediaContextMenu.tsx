"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import {
    AddFromUrlResponseSchema,
    isDownloadable,
} from "@rockit/packages/shared";
import {
    EEvent,
    EMediaContextLocation,
    OkResponseSchema,
    QueueListType,
} from "@rockit/shared";
import {
    ExternalLink,
    HardDriveDownload,
    Library,
    ListEnd,
    ListStart,
    Play,
    PlayCircle,
    RefreshCw,
    Shuffle,
} from "lucide-react";
import {
    isList,
    isNavigable,
    isPlayable,
    isSearchResult,
    TMedia,
    TMediaWithSearch,
    TPlayableMedia,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiDeleteFetch, apiFetch } from "@/lib/utils/apiFetch";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";

function getMediaCover(media: TMediaWithSearch): string | undefined {
    return media.imageUrl;
}

function getMediaTitle(media: TMediaWithSearch): string {
    return media.name;
}

function getMediaDescription(media: TMediaWithSearch): string | undefined {
    if (isSearchResult(media)) return media.artists[0]?.name;
    return undefined;
}

function locationToQueueType(location: EMediaContextLocation): QueueListType {
    switch (location) {
        case EMediaContextLocation.LIBRARY:
            return "library";
        case EMediaContextLocation.HOME:
            return "auto-list";
        case EMediaContextLocation.PLAYLIST:
            return "playlist";
        case EMediaContextLocation.QUEUE:
            return "carousel";
        default:
            return "auto-list";
    }
}

export default function MediaContextMenu({
    children,
    media,
    location,
}: {
    children: ReactNode;
    media: TMediaWithSearch;
    location: EMediaContextLocation;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const isSearch = isSearchResult(media);
    const isListMedia = !isSearch && isList(media);
    const isPlayableMedia = !isSearch && isPlayable(media);
    const isNavigableMedia = !isSearch && isNavigable(media);
    const isDownloadableMedia = !isSearch && isDownloadable(media);
    const isNotDownloadedMedia =
        !isSearch &&
        isDownloadableMedia &&
        isDownloadable(media) &&
        !media.downloaded;
    const showDownloadOption = isDownloadableMedia && isNotDownloadedMedia;

    const handlePlay = () => {
        if (!isPlayableMedia) return;
        const playableMedia = media as TPlayableMedia;
        rockIt.queueManager.setMedia(
            [playableMedia],
            locationToQueueType(location),
            playableMedia.publicId
        );
        rockIt.queueManager.moveToMedia(playableMedia.publicId);
        rockIt.mediaPlayerManager.play();
    };

    const handleNavigate = () => {
        if (!isNavigableMedia) return;
        router.push(media.url);
    };

    const handleAddToLibrary = async () => {
        if (isSearchResult(media)) {
            setLoading(true);
            const searchItem = media;
            const res = await apiFetch(
                `/media/url/add?url=${encodeURIComponent(searchItem.providerUrl)}`,
                AddFromUrlResponseSchema
            );
            setLoading(false);

            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                    publicId: res.result.data.publicId,
                });
                rockIt.notificationManager.notifySuccess(
                    `"${searchItem.name}" added to library`
                );
            }
        } else {
            const res = await apiFetch(
                `/user/library/media/${media.publicId}`,
                OkResponseSchema
            );
            setLoading(false);

            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                    publicId: media.publicId,
                });
                rockIt.notificationManager.notifySuccess(
                    `"${media.name}" added to library`
                );
            }
        }
    };

    const handleRemoveFromLibrary = async () => {
        if (isSearch) return;
        const mediaItem = media;
        const res = await apiDeleteFetch(
            `/user/library/media/${mediaItem.publicId}`,
            OkResponseSchema
        );
        if (res.isOk()) {
            rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromLibrary, {
                publicId: mediaItem.publicId,
            });
        } else {
            rockIt.notificationManager.notifyError(res.message);
        }
    };

    const handlePlayList = () => {
        if (!isListMedia) return;
        console.warn("TODO: Play list");
    };

    const handleAddListToQueue = async () => {
        if (!isListMedia) return;
        const mediaItem = media as TMedia;
        await rockIt.queueManager.addListToTopAsync(
            mediaItem.type as "album" | "playlist",
            mediaItem.publicId
        );
    };

    const handleAddListRandom = async () => {
        if (!isListMedia) return;
        const mediaItem = media as TMedia;
        await rockIt.queueManager.addListRandomAsync(
            mediaItem.type as "album" | "playlist",
            mediaItem.publicId
        );
    };

    const handleAddListToBottom = async () => {
        if (!isListMedia) return;
        const mediaItem = media as TMedia;
        await rockIt.queueManager.addListToBottomAsync(
            mediaItem.type as "album" | "playlist",
            mediaItem.publicId
        );
    };

    const handleRemoveListFromLibrary = async () => {
        if (!isListMedia) return;
        const mediaItem = media as TMedia;
        await rockIt.listManager.removeListFromLibraryAsync(
            mediaItem.type as "album" | "playlist",
            mediaItem.publicId
        );
    };

    const handleDownloadList = () => {
        console.warn("TODO: Download list to device");
    };

    const handleDownloadZip = () => {
        console.warn("TODO: Download ZIP");
    };

    const handleRetryDownload = async () => {
        if (isSearch) return;
        const mediaItem = media as TMedia;
        await rockIt.downloaderManager.startDownloadAsync(
            mediaItem.publicId,
            mediaItem.name
        );
    };

    const handleDownloadMedia = async () => {
        if (isSearch || !isDownloadableMedia) return;
        const mediaItem = media as TMedia;
        await rockIt.downloaderManager.startDownloadAsync(
            mediaItem.publicId,
            mediaItem.name
        );
    };

    const showPlay = isPlayableMedia;
    const disablePlay = showDownloadOption;
    const showNavigate = isNavigableMedia;
    const showRemoveFromLibrary =
        location === EMediaContextLocation.LIBRARY && !isListMedia && !isSearch;
    const showListOptions =
        isListMedia &&
        location !== EMediaContextLocation.SEARCH &&
        location !== EMediaContextLocation.DOWNLOADS;
    const showRemoveListFromLibrary =
        isListMedia && location === EMediaContextLocation.LIBRARY;
    const showRetryDownload = location === EMediaContextLocation.DOWNLOADS;

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent
                cover={getMediaCover(media)}
                title={getMediaTitle(media)}
                description={getMediaDescription(media)}
            >
                {showPlay && (
                    <ContextMenuOption
                        onClick={handlePlay}
                        disable={disablePlay}
                    >
                        <Play className="h-5 w-5" />
                        {$vocabulary.PLAY}
                    </ContextMenuOption>
                )}

                {showNavigate && (
                    <ContextMenuOption onClick={handleNavigate}>
                        <ExternalLink className="h-5 w-5" />
                        {media.type === "album"
                            ? $vocabulary.GO_TO_ALBUM
                            : media.type === "artist"
                              ? $vocabulary.GO_TO_ARTIST
                              : $vocabulary.OPEN_LIST}
                    </ContextMenuOption>
                )}
                {location !== EMediaContextLocation.LIBRARY && (
                    <ContextMenuOption
                        onClick={handleAddToLibrary}
                        disable={loading}
                    >
                        <Library className="h-5 w-5" />
                        {$vocabulary.ADD_TO_LIBRARY}
                    </ContextMenuOption>
                )}

                {showRemoveFromLibrary && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption onClick={handleRemoveFromLibrary}>
                            <Library className="h-5 w-5" />
                            {$vocabulary.REMOVE_FROM_LIBRARY}
                        </ContextMenuOption>
                    </>
                )}

                {showListOptions && (
                    <>
                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={handlePlayList}>
                            <PlayCircle className="h-5 w-5" />
                            {$vocabulary.PLAY_LIST}
                        </ContextMenuOption>

                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={handleAddListToQueue}>
                            <ListStart className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_TO_QUEUE}
                        </ContextMenuOption>

                        <ContextMenuOption onClick={handleAddListRandom}>
                            <Shuffle className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_RANDOMLY}
                        </ContextMenuOption>

                        <ContextMenuOption onClick={handleAddListToBottom}>
                            <ListEnd className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_TO_BOTTOM}
                        </ContextMenuOption>

                        {showRemoveListFromLibrary && (
                            <>
                                <ContextMenuSplitter />
                                <ContextMenuOption
                                    onClick={handleRemoveListFromLibrary}
                                >
                                    <Library className="h-5 w-5" />
                                    {$vocabulary.REMOVE_FROM_LIBRARY}
                                </ContextMenuOption>
                            </>
                        )}

                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={handleDownloadList}>
                            <HardDriveDownload className="h-5 w-5" />
                            {$vocabulary.DOWNLOAD_LIST_TO_DEVICE}
                        </ContextMenuOption>

                        {media.type === "album" && (
                            <ContextMenuOption onClick={handleDownloadZip}>
                                <HardDriveDownload className="h-5 w-5" />
                                {$vocabulary.DOWNLOAD_ZIP}
                            </ContextMenuOption>
                        )}
                    </>
                )}

                {showRetryDownload && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption onClick={handleRetryDownload}>
                            <RefreshCw className="h-5 w-5" />
                            {$vocabulary.RETRY}
                        </ContextMenuOption>
                    </>
                )}

                {showDownloadOption && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption onClick={handleDownloadMedia}>
                            <HardDriveDownload className="h-5 w-5" />
                            {$vocabulary.DOWNLOAD}
                        </ContextMenuOption>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
