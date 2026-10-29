import type { JSX } from "react";
import { isList, isSearchResult } from "@rockit/shared";
import { ListEnd, ListStart, PlayCircle, Shuffle } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export function PlayListAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const playList = async (): Promise<void> => {
        if (!isSearchResult(media) && isList(media))
            await rockIt.queueManager.playList(media);
    };

    return (
        <ContextMenuOption onClick={playList}>
            <PlayCircle className="h-5 w-5" />
            {vocabulary.PLAY_LIST}
        </ContextMenuOption>
    );
}

export function AddToQueueTopAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addToQueueTop = async (): Promise<void> => {
        if (!isSearchResult(media) && isList(media))
            await rockIt.queueManager.addListToQueueTopAsync(media);
    };

    return (
        <ContextMenuOption onClick={addToQueueTop}>
            <ListStart className="h-5 w-5" />
            {vocabulary.ADD_LIST_TO_QUEUE}
        </ContextMenuOption>
    );
}

export function AddQueueRandomAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addQueueRandom = async (): Promise<void> => {
        if (!isSearchResult(media) && isList(media))
            await rockIt.queueManager.addListToQueueRandomAsync(media);
    };

    return (
        <ContextMenuOption onClick={addQueueRandom}>
            <Shuffle className="h-5 w-5" />
            {vocabulary.ADD_LIST_RANDOMLY}
        </ContextMenuOption>
    );
}

export function AddToQueueBottomAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const addToQueueBottom = async (): Promise<void> => {
        if (!isSearchResult(media) && isList(media))
            await rockIt.queueManager.addListToQueueBottomAsync(media);
    };

    return (
        <ContextMenuOption onClick={addToQueueBottom}>
            <ListEnd className="h-5 w-5" />
            {vocabulary.ADD_LIST_TO_BOTTOM}
        </ContextMenuOption>
    );
}
