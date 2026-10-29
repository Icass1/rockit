"use client";

import { ReactNode, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    BasePlaylistWithoutMediasResponse,
    EMediaContextAction,
    EMediaContextLocation,
    getMediaSubtitle,
    isSearchResult,
    TMediaWithSearch,
    type BaseSearchResultsItem,
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
import AddToPlaylistAction, {
    AddToPlaylistAndDownloadAction,
} from "@/components/MediaContextMenu/actions/AddToPlaylistAction";
import DeleteMediaFileAction from "@/components/MediaContextMenu/actions/DeleteAction";
import {
    DownloadAction,
    DownloadSearchResultAction,
    DownloadSearchResultAndAddToLibraryAction,
    DownloadSearchResultAndPlayAction,
    DownloadZipAction,
    RetryDownloadAction,
} from "@/components/MediaContextMenu/actions/DownloadActions";
import DownloadListAction from "@/components/MediaContextMenu/actions/DownloadListAction";
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
import PinNavigationAction from "@/components/MediaContextMenu/actions/PinNavigationAction";
import PlayAction from "@/components/MediaContextMenu/actions/PlayAction";
import RedownloadAction from "@/components/MediaContextMenu/actions/RedownloadAction";
import RemoveFromPlaylistAction from "@/components/MediaContextMenu/actions/RemoveFromPlaylistAction";
import SaveOfflineAction from "@/components/MediaContextMenu/actions/SaveOfflineAction";
import SaveOfflineListAction from "@/components/MediaContextMenu/actions/SaveOfflineListAction";
import ShareAction from "@/components/MediaContextMenu/actions/ShareAction";
import SimilarSongsAction from "@/components/MediaContextMenu/actions/SimilarSongsAction";
import {
    AddSongQueueRandomAction,
    AddSongToQueueBottomAction,
    AddSongToQueueTopAction,
    RemoveFromQueueAction,
} from "@/components/MediaContextMenu/actions/SongQueueActions";
import SearchSourcePicker from "@/components/Search/SearchSourcePicker";

const actionComponents: Partial<
    Record<EMediaContextAction, React.ComponentType<ActionComponentProps>>
> = {
    [EMediaContextAction.PinNavigation]: PinNavigationAction,
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
    [EMediaContextAction.DownloadSearchResultAndPlay]:
        DownloadSearchResultAndPlayAction,
    [EMediaContextAction.RetryDownload]: RetryDownloadAction,
    [EMediaContextAction.DownloadList]: DownloadListAction,
    [EMediaContextAction.DownloadZip]: DownloadZipAction,
    [EMediaContextAction.RemoveFromPlaylist]: RemoveFromPlaylistAction,
    [EMediaContextAction.AddToPlaylist]: AddToPlaylistAction,
    [EMediaContextAction.AddToPlaylistAndDownload]:
        AddToPlaylistAndDownloadAction,
    [EMediaContextAction.DeleteMediaFile]: DeleteMediaFileAction,
    [EMediaContextAction.Redownload]: RedownloadAction,
    [EMediaContextAction.EditMetadata]: EditMetadataAction,
    [EMediaContextAction.SaveOffline]: SaveOfflineAction,
    [EMediaContextAction.SimilarToSong]: SimilarSongsAction,
    [EMediaContextAction.DownloadOfflineList]: SaveOfflineListAction,
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
    sources,
    triggerClassName,
    onOpenChange,
}: {
    children: ReactNode;
    media: TMediaWithSearch;
    location: EMediaContextLocation;
    listPublicId?: string;
    openOnLeftClick?: boolean;
    sources?: readonly BaseSearchResultsItem[];
    triggerClassName?: string;
    onOpenChange?: (open: boolean) => void;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [loading, setLoading] = useState(false);
    const [showEditMetadata, setShowEditMetadata] = useState(false);
    const $playlists = useStore(rockIt.playlistManager.playlistsAtom);

    const [selectedSource, setSelectedSource] = useState(
        isSearchResult(media) ? media.providerUrl : ""
    );
    const activeMedia =
        sources?.find((source) => source.providerUrl === selectedSource) ??
        media;
    const visibleActions = getActionsForMedia(activeMedia, location);

    const isSearch =
        openOnLeftClick !== undefined ? openOnLeftClick : isSearchResult(media);

    const handleAddToPlaylist = async (
        playlist: BasePlaylistWithoutMediasResponse
    ): Promise<void> => {
        if (isSearchResult(activeMedia)) {
            await rockIt.playlistManager.addUrlToPlaylistAsync(
                activeMedia.providerUrl,
                playlist.publicId
            );
        } else {
            await rockIt.playlistManager.addMediaToPlaylist(
                activeMedia,
                playlist
            );
        }
    };

    const actionProps: ActionComponentProps = {
        media: activeMedia,
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
            <ContextMenu onOpenChange={onOpenChange}>
                <ContextMenuTrigger
                    openOnLeftClick={isSearch}
                    className={triggerClassName}
                >
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent
                    cover={getMediaCover(activeMedia)}
                    title={activeMedia.name}
                    description={getMediaSubtitle(activeMedia)}
                >
                    {sources && isSearchResult(activeMedia) && (
                        <SearchSourcePicker
                            sources={sources}
                            selected={activeMedia.providerUrl}
                            onSelect={setSelectedSource}
                        />
                    )}
                    {visibleActions.map((item, index) => {
                        if (item.type === "separator") {
                            return <ContextMenuSplitter key={`sep-${index}`} />;
                        }

                        const action = item as ActionDef;
                        const Component = actionComponents[action.id];
                        if (!Component) return null;

                        return <Component key={action.id} {...actionProps} />;
                    })}
                    {!isSearchResult(media) && <ShareAction {...actionProps} />}
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
