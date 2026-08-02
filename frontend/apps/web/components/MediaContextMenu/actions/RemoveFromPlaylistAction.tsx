import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { ListMinus } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function RemoveFromPlaylistAction({
    media,
    vocabulary,
    listPublicId,
}: ActionComponentProps): JSX.Element {
    const removeFromPlaylist = async (): Promise<void> => {
        if (!isSearchResult(media) && listPublicId) {
            const res =
                await rockIt.playlistManager.removeMediaFromPlaylistByPublicId(
                    media.publicId,
                    listPublicId
                );

            if (res.isNotOk()) {
                rockIt.notificationManager.notifyError(
                    rockIt.vocabularyManager.vocabulary
                        .ERROR_REMOVING_MEDIA_FROM_PLAYLIST
                );
            }
        }
    };

    return (
        <ContextMenuOption onClick={removeFromPlaylist}>
            <ListMinus className="h-5 w-5" />
            {vocabulary.REMOVE_FROM_PLAYLIST}
        </ContextMenuOption>
    );
}
