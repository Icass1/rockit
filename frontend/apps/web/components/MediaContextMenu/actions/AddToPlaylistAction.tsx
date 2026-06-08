import type { JSX } from "react";
import { ListIcon } from "lucide-react";
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
