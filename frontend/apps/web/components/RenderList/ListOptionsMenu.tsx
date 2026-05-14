"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    isDownloadable,
    isPlayable,
    isQueueable,
    TMedia,
} from "@rockit/packages/shared";
import {
    Download,
    ListEnd,
    ListStart,
    MoreHorizontal,
    Play,
    Shuffle,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuSplitter,
    PopupMenuTrigger,
} from "@/components/PopupMenu";

export default function ListOptionsMenu({
    media,
    listPublicId,
    title,
}: {
    media: TMedia[];
    listPublicId?: string;
    title: string;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const playableMedia = media.filter(isPlayable);
    const notDownloadedMedia = media.filter(
        (m): boolean => isDownloadable(m) && m.downloaded !== true
    );

    const handlePlay = (): void => {
        if (!listPublicId || !playableMedia.length) return;
        rockIt.queueManager.setMedia(
            playableMedia.filter(isQueueable),
            listPublicId
        );
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    };

    const handleDownloadAll = (): void => {
        if (!notDownloadedMedia.length) return;
        const ids = notDownloadedMedia.map((m): string => m.publicId);
        rockIt.downloaderManager.downloadMediaAsync(ids, title);
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <MoreHorizontal className="h-5 w-5" />
            </PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    onClick={handlePlay}
                    disable={!listPublicId || !playableMedia.length}
                >
                    <Play className="h-4 w-4" />
                    {$vocabulary.PLAY_LIST}
                </PopupMenuOption>

                <PopupMenuSplitter />

                <PopupMenuOption disable>
                    <ListStart className="h-4 w-4" />
                    {$vocabulary.ADD_LIST_TO_QUEUE}
                </PopupMenuOption>

                <PopupMenuOption disable>
                    <Shuffle className="h-4 w-4" />
                    {$vocabulary.ADD_LIST_RANDOMLY}
                </PopupMenuOption>

                <PopupMenuOption disable>
                    <ListEnd className="h-4 w-4" />
                    {$vocabulary.ADD_LIST_TO_BOTTOM}
                </PopupMenuOption>

                <PopupMenuSplitter />

                <PopupMenuOption
                    onClick={handleDownloadAll}
                    disable={!notDownloadedMedia.length}
                >
                    <Download className="h-4 w-4" />
                    {$vocabulary.DOWNLOAD_LIST_TO_SERVER}
                    {notDownloadedMedia.length > 0 &&
                        ` (${notDownloadedMedia.length})`}
                </PopupMenuOption>
            </PopupMenuContent>
        </PopupMenu>
    );
}
