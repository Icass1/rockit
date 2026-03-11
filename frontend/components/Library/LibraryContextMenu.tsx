"use client";

import { ReactNode } from "react";
import { BaseAlbumWithoutSongsResponse, BasePlaylistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    HardDriveDownload,
    Library,
    ListEnd,
    ListStart,
    PinIcon,
    PinOff,
    PlayCircle,
    Shuffle,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";

export function AddListContextMenu({
    children,
    list,
}: {
    children: ReactNode;
    list: BasePlaylistResponse | BaseAlbumWithoutSongsResponse;
}) {
    const $pinnedLists = useStore(rockIt.listManager.pinnedListsAtom);
    const isPinned = $pinnedLists.find(
        (_list) => _list.publicId === list.publicId
    );
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.playAsync(list.type, list.publicId)
                    }
                >
                    <PlayCircle className="h-5 w-5" />
                    {$vocabulary.PLAY_LIST}
                </ContextMenuOption>

                <ContextMenuSplitter />

                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToTopAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <ListStart className="h-5 w-5" />
                    {$vocabulary.ADD_LIST_TO_QUEUE}
                </ContextMenuOption>

                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListRandomAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Shuffle className="h-5 w-5" />
                    {$vocabulary.ADD_LIST_RANDOMLY}
                </ContextMenuOption>

                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToBottomAsync(
                            list.type,
                            list.publicId
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
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Library className="h-5 w-5" />
                    {$vocabulary.REMOVE_FROM_LIBRARY}
                </ContextMenuOption>

                {isPinned ? (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.unPinListAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <PinOff className="h-5 w-5" />
                        {$vocabulary.UNPIN}
                    </ContextMenuOption>
                ) : (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.pinListAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <PinIcon className="h-5 w-5" />
                        {$vocabulary.PIN}
                    </ContextMenuOption>
                )}

                <ContextMenuSplitter />

                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.downloadListToDeviceAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {$vocabulary.DOWNLOAD_LIST_TO_DEVICE}
                </ContextMenuOption>

                {list.type === "album" && (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.downloadListZipAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        {$vocabulary.DOWNLOAD_ZIP}
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
