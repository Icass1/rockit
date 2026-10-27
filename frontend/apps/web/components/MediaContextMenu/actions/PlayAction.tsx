import type { JSX } from "react";
import { isDownloadable, isQueueable, isSearchResult } from "@rockit/shared";
import { Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function PlayAction({
    media,
    vocabulary,
    listPublicId,
    loading,
    setLoading,
}: ActionComponentProps): JSX.Element {
    const play = async (): Promise<void> => {
        if (loading) return;
        if (isSearchResult(media)) {
            setLoading(true);
            try {
                await rockIt.searchManager.playDownloadedSong(media);
            } finally {
                setLoading(false);
            }
            return;
        }
        if (!isSearchResult(media) && isQueueable(media)) {
            if (listPublicId) {
                void rockIt.queueManager.playCollection(
                    listPublicId,
                    media.publicId
                );
                return;
            }
            rockIt.queueManager.setMedia([media], media.publicId);
            rockIt.queueManager.moveToMedia(media.publicId);
            rockIt.mediaPlayerManager.play();
        }
    };

    const disablePlay =
        !isSearchResult(media) && isDownloadable(media) && !media.downloaded;

    return (
        <ContextMenuOption onClick={play} disable={disablePlay || loading}>
            <Play className="h-5 w-5" />
            {vocabulary.PLAY}
        </ContextMenuOption>
    );
}
