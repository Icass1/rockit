import type { JSX } from "react";
import { Play } from "lucide-react";
import { isDownloadable, isQueueable, isSearchResult } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "./ActionProps";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disablePlay = isDownloadable(media as any) && !(media as any).downloaded;

    return (
        <ContextMenuOption onClick={play} disable={disablePlay}>
            <Play className="h-5 w-5" />
            {vocabulary.PLAY}
        </ContextMenuOption>
    );
}
