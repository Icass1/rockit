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
import { useLanguage } from "@/contexts/LanguageContext";
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
    const { langFile: lang } = useLanguage();

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
                    {lang?.play_list ?? "Play list"}
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
                    {lang?.add_list_to_queue ?? "Add list to top of queue"}
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
                    {lang?.add_list_randomly ?? "Add list to queue randomly"}
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
                    {lang?.add_list_to_bottom ?? "Add list to bottom of queue"}
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
                    {lang?.remove_from_library ?? "Remove from library"}
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
                        {lang?.unpin ?? "Unpin"}
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
                        {lang?.pin ?? "Pin"}
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
                    {lang?.download_list_to_device ?? "Download list"}
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
                        {lang?.download_zip ?? "Download ZIP"}
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
