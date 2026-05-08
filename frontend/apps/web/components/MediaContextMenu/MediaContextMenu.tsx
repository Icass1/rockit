"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { isDownloadable } from "@rockit/packages/shared";
import { EMediaContextLocation, QueueListType } from "@rockit/shared";
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
    TMediaWithSearch,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
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
        const playableMedia = media;
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
        setLoading(true);
        await rockIt.libraryManager.addMediaToLibrary(media);
        setLoading(false);
    };

    const handleRemoveFromLibrary = async () => {
        if (isSearch) return;
        await rockIt.libraryManager.removeMediaFromLibrary(media);
    };

    const handlePlayList = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.playList(media);
    };

    const handleAddListToQueue = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueTopAsync(media);
    };

    const handleAddListRandom = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueRandomAsync(media);
    };

    const handleAddListToBottom = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueBottomAsync(media);
    };

    const handleDownloadListZip = () => {
        console.warn("TODO: Download ZIP");
    };

    const handleRetryDownload = async () => {
        if (isSearch) return;
        rockIt.mediaManager.downloadMedia(media);
    };

    const handleDownloadMedia = async () => {
        if (isSearch || !isDownloadableMedia) return;
        rockIt.mediaManager.downloadMedia(media);
    };

    const showPlay = isPlayableMedia;
    const disablePlay = showDownloadOption;
    const showNavigate = isNavigableMedia;
    const showRemoveFromLibrary =
        location === EMediaContextLocation.LIBRARY && !isSearch;
    const showListOptions =
        isListMedia &&
        location !== EMediaContextLocation.SEARCH &&
        location !== EMediaContextLocation.DOWNLOADS;
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

                        <ContextMenuSplitter />

                        {media.type === "album" && (
                            <ContextMenuOption onClick={handleDownloadListZip}>
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
