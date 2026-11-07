import type { JSX } from "react";
import type { BaseSearchResultsItem } from "@/dto";
import { ListIcon, ListPlus } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";
import SubContextMenuContent from "@/components/ui/ContextMenu/SubContextMenu/Content";
import SubContextMenu from "@/components/ui/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ui/ContextMenu/SubContextMenu/Trigger";

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
                {playlists.map((playlist): JSX.Element => (
                    <ContextMenuOption
                        onClick={async () => {
                            await handleAddToPlaylist(playlist);
                        }}
                        key={playlist.publicId}
                    >
                        {playlist.name}
                    </ContextMenuOption>
                ))}
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
                {playlists.map((playlist): JSX.Element => (
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
                ))}
            </SubContextMenuContent>
        </SubContextMenu>
    );
}
