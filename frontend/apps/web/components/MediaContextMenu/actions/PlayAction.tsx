import type { JSX } from "react";
import { isDownloadable, isQueueable, isSearchResult } from "@rockit/shared";
import { Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function PlayAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const play = (): void => {
        if (!isSearchResult(media) && isQueueable(media)) {
            rockIt.queueManager.setMedia([media], media.publicId);
            rockIt.queueManager.moveToMedia(media.publicId);
            rockIt.mediaPlayerManager.play();
        }
    };

    const disablePlay =
        !isSearchResult(media) && isDownloadable(media) && !media.downloaded;

    return (
        <ContextMenuOption onClick={play} disable={disablePlay}>
            <Play className="h-5 w-5" />
            {vocabulary.PLAY}
        </ContextMenuOption>
    );
}
