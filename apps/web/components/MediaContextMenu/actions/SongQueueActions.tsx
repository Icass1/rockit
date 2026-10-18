import type { JSX } from "react";
import { isQueueable, isSearchResult } from "@rockit/shared";
import { ListEnd, ListStart, Shuffle, X } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export function AddSongToQueueTopAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addSongToQueueTop = (): void => {
        if (!isSearchResult(media) && isQueueable(media))
            rockIt.queueManager.addMediaNext(media);
    };

    return (
        <ContextMenuOption onClick={addSongToQueueTop}>
            <ListStart className="h-5 w-5" />
            {vocabulary.ADD_SONG_TO_QUEUE}
        </ContextMenuOption>
    );
}

export function AddSongQueueRandomAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addSongQueueRandom = (): void => {
        if (!isSearchResult(media) && isQueueable(media))
            rockIt.queueManager.addMediaRandom(media);
    };

    return (
        <ContextMenuOption onClick={addSongQueueRandom}>
            <Shuffle className="h-5 w-5" />
            {vocabulary.ADD_LIST_RANDOMLY}
        </ContextMenuOption>
    );
}

export function AddSongToQueueBottomAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addSongToQueueBottom = (): void => {
        if (!isSearchResult(media) && isQueueable(media))
            rockIt.queueManager.addMediaToEnd(media);
    };

    return (
        <ContextMenuOption onClick={addSongToQueueBottom}>
            <ListEnd className="h-5 w-5" />
            {vocabulary.ADD_LIST_TO_BOTTOM}
        </ContextMenuOption>
    );
}

export function RemoveFromQueueAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const removeFromQueue = (): void => {
        if (!isSearchResult(media) && isQueueable(media))
            rockIt.queueManager.removeMediaFromQueue(media);
    };

    return (
        <ContextMenuOption onClick={removeFromQueue}>
            <X className="h-5 w-5" />
            {vocabulary.REMOVE_FROM_QUEUE}
        </ContextMenuOption>
    );
}
