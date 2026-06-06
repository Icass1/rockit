"use client";

import { ReactNode, useCallback, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    BasePlaylistWithoutMediasResponse,
    EMediaContextLocation,
    getMediaSubtitle,
    isSearchResult,
    TMediaWithSearch,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import {
    getActionsForMedia,
    type ActionId,
    type ActionDef,
} from "@/components/ContextMenu/mediaContextMenuActions";

import PlayAction from "./actions/PlayAction";
import NavigateAction from "./actions/NavigateAction";
import {
    AddToLibraryAction,
    RemoveFromLibraryAction,
} from "./actions/LibraryActions";
import {
    PlayListAction,
    AddToQueueTopAction,
    AddQueueRandomAction,
    AddToQueueBottomAction,
} from "./actions/ListQueueActions";
import {
    AddSongToQueueTopAction,
    AddSongQueueRandomAction,
    AddSongToQueueBottomAction,
    RemoveFromQueueAction,
} from "./actions/SongQueueActions";
import {
    DownloadAction,
    RetryDownloadAction,
    DownloadZipAction,
} from "./actions/DownloadActions";
import RemoveFromPlaylistAction from "./actions/RemoveFromPlaylistAction";
import AddToPlaylistAction from "./actions/AddToPlaylistAction";
import type { ActionComponentProps } from "./actions/ActionProps";

const actionComponents: Partial<
    Record<ActionId, React.ComponentType<ActionComponentProps>>
> = {
    play: PlayAction,
    navigate: NavigateAction,
    addToLibrary: AddToLibraryAction,
    removeFromLibrary: RemoveFromLibraryAction,
    playList: PlayListAction,
    addToQueueTop: AddToQueueTopAction,
    addQueueRandom: AddQueueRandomAction,
    addToQueueBottom: AddToQueueBottomAction,
    addSongToQueueTop: AddSongToQueueTopAction,
    addSongQueueRandom: AddSongQueueRandomAction,
    addSongToQueueBottom: AddSongToQueueBottomAction,
    removeFromQueue: RemoveFromQueueAction,
    download: DownloadAction,
    retryDownload: RetryDownloadAction,
    downloadZip: DownloadZipAction,
    removeFromPlaylist: RemoveFromPlaylistAction,
    addToPlaylist: AddToPlaylistAction,
};

function getMediaCover(media: TMediaWithSearch): string | undefined {
    return media.imageUrl;
}

export default function MediaContextMenu({
    children,
    media,
    location,
    listPublicId,
    openOnLeftClick,
}: {
    children: ReactNode;
    media: TMediaWithSearch;
    location: EMediaContextLocation;
    listPublicId?: string;
    openOnLeftClick?: boolean;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [loading, setLoading] = useState(false);
    const $playlists = useStore(rockIt.playlistManager.playlistsAtom);

    const visibleActions = getActionsForMedia(media, location);

    const isSearch =
        openOnLeftClick !== undefined
            ? openOnLeftClick
            : isSearchResult(media);

    const handleAddToPlaylist = useCallback(
        async (
            playlist: BasePlaylistWithoutMediasResponse
        ): Promise<void> => {
            if (isSearchResult(media)) {
                rockIt.playlistManager.addUrlToPlaylistAsync(
                    media.providerUrl,
                    playlist.publicId
                );
            } else {
                rockIt.playlistManager.addMediaToPlaylist(
                    media,
                    playlist
                );
            }
        },
        [media]
    );

    const actionProps: ActionComponentProps = {
        media,
        vocabulary: $vocabulary,
        playlists: $playlists,
        loading,
        setLoading,
        listPublicId,
        handleAddToPlaylist,
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger openOnLeftClick={isSearch}>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent
                cover={getMediaCover(media)}
                title={media.name}
                description={getMediaSubtitle(media)}
            >
                {visibleActions.map((item, index) => {
                    if (item.type === "separator") {
                        return (
                            <ContextMenuSplitter
                                key={`sep-${index}`}
                            />
                        );
                    }

                    const action = item as ActionDef;
                    const Component = actionComponents[action.id];
                    if (!Component) return null;

                    return (
                        <Component
                            key={action.id}
                            {...actionProps}
                        />
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
}
