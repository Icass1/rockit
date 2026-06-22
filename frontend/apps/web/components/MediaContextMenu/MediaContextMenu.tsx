"use client";

import { ReactNode, useCallback, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    BasePlaylistWithoutMediasResponse,
    EMediaContextAction,
    EMediaContextLocation,
    getMediaSubtitle,
    isSearchResult,
    TMediaWithSearch,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import {
    getActionsForMedia,
    type ActionDef,
} from "@/components/ContextMenu/mediaContextMenuActions";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import EditMetadataModal from "@/components/EditMetadata/EditMetadataModal";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import AddToPlaylistAction from "@/components/MediaContextMenu/actions/AddToPlaylistAction";
import DeleteAction from "@/components/MediaContextMenu/actions/DeleteAction";
import {
    DownloadAction,
    DownloadSearchResultAction,
    DownloadSearchResultAndAddToLibraryAction,
    DownloadZipAction,
    RetryDownloadAction,
} from "@/components/MediaContextMenu/actions/DownloadActions";
import EditMetadataAction from "@/components/MediaContextMenu/actions/EditMetadataAction";
import {
    AddToLibraryAction,
    RemoveFromLibraryAction,
} from "@/components/MediaContextMenu/actions/LibraryActions";
import {
    AddQueueRandomAction,
    AddToQueueBottomAction,
    AddToQueueTopAction,
    PlayListAction,
} from "@/components/MediaContextMenu/actions/ListQueueActions";
import NavigateAction from "@/components/MediaContextMenu/actions/NavigateAction";
import PlayAction from "@/components/MediaContextMenu/actions/PlayAction";
import RedownloadAction from "@/components/MediaContextMenu/actions/RedownloadAction";
import RemoveFromPlaylistAction from "@/components/MediaContextMenu/actions/RemoveFromPlaylistAction";
import {
    AddSongQueueRandomAction,
    AddSongToQueueBottomAction,
    AddSongToQueueTopAction,
    RemoveFromQueueAction,
} from "@/components/MediaContextMenu/actions/SongQueueActions";

const actionComponents: Partial<
    Record<EMediaContextAction, React.ComponentType<ActionComponentProps>>
> = {
    [EMediaContextAction.Play]: PlayAction,
    [EMediaContextAction.Navigate]: NavigateAction,
    [EMediaContextAction.AddToLibrary]: AddToLibraryAction,
    [EMediaContextAction.RemoveFromLibrary]: RemoveFromLibraryAction,
    [EMediaContextAction.PlayList]: PlayListAction,
    [EMediaContextAction.AddToQueueTop]: AddToQueueTopAction,
    [EMediaContextAction.AddQueueRandom]: AddQueueRandomAction,
    [EMediaContextAction.AddToQueueBottom]: AddToQueueBottomAction,
    [EMediaContextAction.AddSongToQueueTop]: AddSongToQueueTopAction,
    [EMediaContextAction.AddMediaQueueRandom]: AddSongQueueRandomAction,
    [EMediaContextAction.AddMediaToQueueBottom]: AddSongToQueueBottomAction,
    [EMediaContextAction.RemoveFromQueue]: RemoveFromQueueAction,
    [EMediaContextAction.Download]: DownloadAction,
    [EMediaContextAction.DownloadSearchResult]: DownloadSearchResultAction,
    [EMediaContextAction.DownloadSearchResultAndAddToLibrary]:
        DownloadSearchResultAndAddToLibraryAction,
    [EMediaContextAction.RetryDownload]: RetryDownloadAction,
    [EMediaContextAction.DownloadZip]: DownloadZipAction,
    [EMediaContextAction.RemoveFromPlaylist]: RemoveFromPlaylistAction,
    [EMediaContextAction.AddToPlaylist]: AddToPlaylistAction,
    [EMediaContextAction.Delete]: DeleteAction,
    [EMediaContextAction.Redownload]: RedownloadAction,
    [EMediaContextAction.EditMetadata]: EditMetadataAction,
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
    const [showEditMetadata, setShowEditMetadata] = useState(false);
    const $playlists = useStore(rockIt.playlistManager.playlistsAtom);

    const visibleActions = getActionsForMedia(media, location);

    const isSearch =
        openOnLeftClick !== undefined ? openOnLeftClick : isSearchResult(media);

    const handleAddToPlaylist = useCallback(
        async (playlist: BasePlaylistWithoutMediasResponse): Promise<void> => {
            if (isSearchResult(media)) {
                rockIt.playlistManager.addUrlToPlaylistAsync(
                    media.providerUrl,
                    playlist.publicId
                );
            } else {
                rockIt.playlistManager.addMediaToPlaylist(media, playlist);
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
        onEditMetadata: (): void => setShowEditMetadata(true),
    };

    return (
        <>
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
                            return <ContextMenuSplitter key={`sep-${index}`} />;
                        }

                        const action = item as ActionDef;
                        const Component = actionComponents[action.id];
                        if (!Component) return null;

                        return <Component key={action.id} {...actionProps} />;
                    })}
                </ContextMenuContent>
            </ContextMenu>
            {showEditMetadata && (
                <EditMetadataModal
                    media={media}
                    onClose={(): void => setShowEditMetadata(false)}
                />
            )}
        </>
    );
}
