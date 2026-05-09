"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import {
    BasePlaylistWithoutMediasResponse,
    EMediaContextLocation,
    EMediaType,
    getMediaSubtitle,
    isDownloadable,
    isQueueable,
} from "@rockit/shared";
import {
    ExternalLink,
    HardDriveDownload,
    Library,
    ListEnd,
    ListIcon,
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
import SubContextMenuContent from "@/components/ContextMenu/SubContextMenu/Content";
import SubContextMenu from "@/components/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ContextMenu/SubContextMenu/Trigger";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";

function getMediaCover(media: TMediaWithSearch): string | undefined {
    return media.imageUrl;
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

    const [playlists, setPlaylists] = useState<
        BasePlaylistWithoutMediasResponse[]
    >([]);

    const isSearch = isSearchResult(media);
    const isListMedia = !isSearch && isList(media);
    const isPlayableMedia = !isSearch && isPlayable(media);
    const isQueueableMedia = !isSearch && isQueueable(media);
    const isNavigableMedia = !isSearch && isNavigable(media);
    const isDownloadableMedia = !isSearch && isDownloadable(media);
    const isNotDownloadedMedia =
        !isSearch &&
        isDownloadableMedia &&
        isDownloadable(media) &&
        !media.downloaded;
    const showDownloadOption = isDownloadableMedia && isNotDownloadedMedia;

    useEffect(() => {
        rockIt.playlistManager.getUserPlaylistsAsync().then((data) => {
            if (data.isOk()) {
                setPlaylists(data.result.playlists);
            }
        });
    }, []);

    const handlePlay = () => {
        if (isQueueableMedia) {
            rockIt.queueManager.setMedia([media], media.publicId);
            rockIt.queueManager.moveToMedia(media.publicId);
            rockIt.mediaPlayerManager.play();
        } else {
            console.log("Media is not queueable.");
        }
    };

    const handleNavigate = () => {
        if (!isNavigableMedia) return;
        router.push(media.url);
    };

    const handleAddToLibraryAsync = async () => {
        setLoading(true);
        await rockIt.libraryManager.addMediaToLibrary(media);
        setLoading(false);
    };

    const handleRemoveFromLibraryAsync = async () => {
        if (isSearch) return;
        await rockIt.libraryManager.removeMediaFromLibrary(media);
    };

    const handlePlayListAsync = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.playList(media);
    };

    const handleAddListToQueueAsync = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueTopAsync(media);
    };

    const handleAddListRandomAsync = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueRandomAsync(media);
    };

    const handleAddListToBottomAsync = async () => {
        if (!isListMedia) return;
        await rockIt.queueManager.addListToQueueBottomAsync(media);
    };

    const handleDownloadListZip = () => {
        console.warn("TODO: Download ZIP");
    };

    const handleRetryDownloadAsync = async () => {
        if (isSearch) return;
        rockIt.mediaManager.downloadMedia(media);
    };

    const handleDownloadMediaAsync = async () => {
        if (isSearch || !isDownloadableMedia) return;
        rockIt.mediaManager.downloadMedia(media);
    };

    const handleAddToPlaylistAsync = async (
        media: TMediaWithSearch,
        playlist: BasePlaylistWithoutMediasResponse
    ) => {
        if (isSearchResult(media)) {
            rockIt.playlistManager.addUrlToPlaylistAsync(
                media.providerUrl,
                playlist.publicId
            );
        } else {
            rockIt.playlistManager.addMediaToPlaylist(media, playlist);
        }
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
                title={media.name}
                description={getMediaSubtitle(media)}
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

                <SubContextMenu>
                    <SubContextMenuTrigger>
                        <ListIcon />
                        {$vocabulary.ADD_MEDIA_TO_PLAYLIST}
                    </SubContextMenuTrigger>
                    <SubContextMenuContent>
                        {playlists.map((playlist) => (
                            <ContextMenuOption
                                onClick={() =>
                                    handleAddToPlaylistAsync(media, playlist)
                                }
                                key={playlist.publicId}
                            >
                                {playlist.name}
                            </ContextMenuOption>
                        ))}
                    </SubContextMenuContent>
                </SubContextMenu>

                {showNavigate && (
                    <ContextMenuOption onClick={handleNavigate}>
                        <ExternalLink className="h-5 w-5" />
                        {media.type === EMediaType.Album
                            ? $vocabulary.GO_TO_ALBUM
                            : media.type === EMediaType.Artist
                              ? $vocabulary.GO_TO_ARTIST
                              : $vocabulary.OPEN_LIST}
                    </ContextMenuOption>
                )}
                {location !== EMediaContextLocation.LIBRARY && (
                    <ContextMenuOption
                        onClick={handleAddToLibraryAsync}
                        disable={loading}
                    >
                        <Library className="h-5 w-5" />
                        {$vocabulary.ADD_TO_LIBRARY}
                    </ContextMenuOption>
                )}

                {showRemoveFromLibrary && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption
                            onClick={handleRemoveFromLibraryAsync}
                        >
                            <Library className="h-5 w-5" />
                            {$vocabulary.REMOVE_FROM_LIBRARY}
                        </ContextMenuOption>
                    </>
                )}

                {showListOptions && (
                    <>
                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={handlePlayListAsync}>
                            <PlayCircle className="h-5 w-5" />
                            {$vocabulary.PLAY_LIST}
                        </ContextMenuOption>

                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={handleAddListToQueueAsync}>
                            <ListStart className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_TO_QUEUE}
                        </ContextMenuOption>

                        <ContextMenuOption onClick={handleAddListRandomAsync}>
                            <Shuffle className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_RANDOMLY}
                        </ContextMenuOption>

                        <ContextMenuOption onClick={handleAddListToBottomAsync}>
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
                        <ContextMenuOption onClick={handleRetryDownloadAsync}>
                            <RefreshCw className="h-5 w-5" />
                            {$vocabulary.RETRY}
                        </ContextMenuOption>
                    </>
                )}

                {showDownloadOption && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption onClick={handleDownloadMediaAsync}>
                            <HardDriveDownload className="h-5 w-5" />
                            {$vocabulary.DOWNLOAD}
                        </ContextMenuOption>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
