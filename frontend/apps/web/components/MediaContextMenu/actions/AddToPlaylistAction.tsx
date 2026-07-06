import type { JSX } from "react";
import type { BaseSearchResultsItem } from "@/dto";
import { ListIcon, ListPlus } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import SubContextMenuContent from "@/components/ContextMenu/SubContextMenu/Content";
import SubContextMenu from "@/components/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ContextMenu/SubContextMenu/Trigger";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function AddToPlaylistAction({
    vocabulary,
    playlists,
    handleAddToPlaylist,
}: ActionComponentProps): JSX.Element {
    return (
        <SubContextMenu>
            <SubContextMenuTrigger>
                <ListIcon />
                {vocabulary.ADD_MEDIA_TO_PLAYLIST}
            </SubContextMenuTrigger>
            <SubContextMenuContent>
                {playlists.map(
                    (playlist): JSX.Element => (
                        <ContextMenuOption
                            onClick={async () => {
                                await handleAddToPlaylist(playlist);
                            }}
                            key={playlist.publicId}
                        >
                            {playlist.name}
                        </ContextMenuOption>
                    )
                )}
            </SubContextMenuContent>
        </SubContextMenu>
    );
}

export function AddToPlaylistAndDownloadAction({
    media,
    vocabulary,
    playlists,
}: ActionComponentProps): JSX.Element {
    return (
        <SubContextMenu>
            <SubContextMenuTrigger>
                <ListPlus />
                {vocabulary.ADD_TO_PLAYLIST_AND_DOWNLOAD}
            </SubContextMenuTrigger>
            <SubContextMenuContent>
                {playlists.map(
                    (playlist): JSX.Element => (
                        <ContextMenuOption
                            onClick={async () => {
                                await rockIt.playlistManager.addUrlToPlaylistAndDownloadAsync(
                                    media as BaseSearchResultsItem,
                                    playlist.publicId
                                );
                            }}
                            key={playlist.publicId}
                        >
                            {playlist.name}
                        </ContextMenuOption>
                    )
                )}
            </SubContextMenuContent>
        </SubContextMenu>
    );
}
