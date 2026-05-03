"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { EEvent, OkResponseSchema } from "@rockit/shared";
import {
    ExternalLink,
    HardDriveDownload,
    Library,
    ListEnd,
    ListStart,
    Play,
    PlayCircle,
    Shuffle,
} from "lucide-react";
import {
    isNavigable,
    isPlayable,
    TMedia,
    TPlayableMedia,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiDeleteFetch } from "@/lib/utils/apiFetch";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";

export default function UnifiedMediaContextMenu({
    children,
    media,
}: {
    children: ReactNode;
    media: TMedia;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const router = useRouter();
    const isList = media.type === "album" || media.type === "playlist";

    const handlePlay = () => {
        const playableMedia = media as TPlayableMedia;
        rockIt.queueManager.setMedia(
            [playableMedia],
            "library",
            playableMedia.publicId
        );
        rockIt.queueManager.moveToMedia(playableMedia.publicId);
        rockIt.mediaPlayerManager.play();
    };

    const handleRemoveFromLibrary = async () => {
        const res = await apiDeleteFetch(
            `/user/library/media/${media.publicId}`,
            OkResponseSchema
        );
        if (res.isOk()) {
            rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromLibrary, {
                publicId: media.publicId,
            });
        } else {
            console.error(
                "Failed to remove from library",
                res.message,
                res.detail
            );
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                {isPlayable(media) && (
                    <ContextMenuOption onClick={handlePlay}>
                        <Play className="h-5 w-5" />
                        {$vocabulary.PLAY}
                    </ContextMenuOption>
                )}

                {isNavigable(media) && (
                    <ContextMenuOption onClick={() => router.push(media.url)}>
                        <ExternalLink className="h-5 w-5" />
                        {media.type === "album"
                            ? $vocabulary.GO_TO_ALBUM
                            : media.type === "artist"
                              ? $vocabulary.GO_TO_ARTIST
                              : $vocabulary.OPEN_LIST}
                    </ContextMenuOption>
                )}

                {!isList && (
                    <>
                        <ContextMenuSplitter />
                        <ContextMenuOption onClick={handleRemoveFromLibrary}>
                            <Library className="h-5 w-5" />
                            {$vocabulary.REMOVE_FROM_LIBRARY}
                        </ContextMenuOption>
                    </>
                )}

                {isList && (
                    <>
                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={() => console.warn("TODO")}>
                            <PlayCircle className="h-5 w-5" />
                            {$vocabulary.PLAY_LIST}
                        </ContextMenuOption>

                        <ContextMenuSplitter />

                        <ContextMenuOption
                            onClick={() =>
                                rockIt.queueManager.addListToTopAsync(
                                    media.type as "album" | "playlist",
                                    media.publicId
                                )
                            }
                        >
                            <ListStart className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_TO_QUEUE}
                        </ContextMenuOption>

                        <ContextMenuOption
                            onClick={() =>
                                rockIt.queueManager.addListRandomAsync(
                                    media.type as "album" | "playlist",
                                    media.publicId
                                )
                            }
                        >
                            <Shuffle className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_RANDOMLY}
                        </ContextMenuOption>

                        <ContextMenuOption
                            onClick={() =>
                                rockIt.queueManager.addListToBottomAsync(
                                    media.type as "album" | "playlist",
                                    media.publicId
                                )
                            }
                        >
                            <ListEnd className="h-5 w-5" />
                            {$vocabulary.ADD_LIST_TO_BOTTOM}
                        </ContextMenuOption>

                        <ContextMenuSplitter />

                        <ContextMenuOption
                            onClick={() =>
                                rockIt.listManager.removeListFromLibraryAsync(
                                    media.type as "album" | "playlist",
                                    media.publicId
                                )
                            }
                        >
                            <Library className="h-5 w-5" />
                            {$vocabulary.REMOVE_FROM_LIBRARY}
                        </ContextMenuOption>

                        <ContextMenuSplitter />

                        <ContextMenuOption onClick={() => console.warn("TODO")}>
                            <HardDriveDownload className="h-5 w-5" />
                            {$vocabulary.DOWNLOAD_LIST_TO_DEVICE}
                        </ContextMenuOption>

                        {media.type === "album" && (
                            <ContextMenuOption
                                onClick={() => console.warn("TODO")}
                            >
                                <HardDriveDownload className="h-5 w-5" />
                                {$vocabulary.DOWNLOAD_ZIP}
                            </ContextMenuOption>
                        )}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
