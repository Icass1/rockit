import type { JSX } from "react";
import { ListMinus } from "lucide-react";
import { isSearchResult } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "./ActionProps";

export default function RemoveFromPlaylistAction({
    media,
    vocabulary,
    listPublicId,
}: ActionComponentProps): JSX.Element {
    const removeFromPlaylist = async (): Promise<void> => {
        if (!isSearchResult(media) && listPublicId) {
            await rockIt.playlistManager.removeMediaFromPlaylistByPublicId(
                media.publicId,
                listPublicId
            );
        }
    };

    return (
        <ContextMenuOption onClick={removeFromPlaylist}>
            <ListMinus className="h-5 w-5" />
            {vocabulary.REMOVE_FROM_PLAYLIST}
        </ContextMenuOption>
    );
}
