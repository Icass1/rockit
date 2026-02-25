import { rockIt } from "@/lib/rockit/rockIt";
import { playListHandleClick } from "@/components/PlayList";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { DBListType } from "@/types/rockIt";
import { useStore } from "@nanostores/react";
import {
    Download,
    HardDriveDownload,
    HardDriveDownloadIcon,
    Heart,
    Library,
    ListEnd,
    ListStart,
    Menu,
    Pin,
    PinOff,
    Play,
} from "lucide-react";

export default function ListOptions({
    type,
    publicId,
    internalImageUrl,
    allSongsInDatabase,
}: {
    type: DBListType;
    publicId: string;
    internalImageUrl?: string;
    allSongsInDatabase: boolean;
}) {
    const $libraryLists = useStore(rockIt.listManager.libraryListsAtom);
    const isInLibrary = $libraryLists.some(
        (list) => list.publicId === publicId
    );

    // // Determina si el elemento ya está en la lista
    const $pinnedLists = useStore(rockIt.listManager.pinnedListsAtom);
    const isPinned = $pinnedLists.some((list) => list.publicId === publicId);

    const $downloadedLists = useStore(
        rockIt.downloaderManager.downloadedListsAtom
    );

    return (
        <PopupMenu>
            <PopupMenuTrigger className="pt-[2px]">
                <Menu
                    strokeWidth={1.3}
                    className="z-50 h-6 w-6 cursor-pointer"
                />
            </PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() => playListHandleClick({ type, id: publicId })}
                >
                    <Play className="h-5 w-5" />
                    Play list
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.listManager.likeAllSongsAsync(type, publicId)
                    }
                >
                    <Heart className="h-5 w-5" />
                    Like all songs on the list
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.listManager.addListToTopQueueAsync(
                            type,
                            publicId
                        )
                    }
                >
                    <ListStart className="h-5 w-5" />
                    Add list to top of queue
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.listManager.addListToBottomQueueAsync(
                            type,
                            publicId
                        )
                    }
                >
                    <ListEnd className="h-5 w-5" />
                    Add list to bottom of queue
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.indexedDBManager.downloadListToDeviceAsync(
                            type,
                            publicId,
                            internalImageUrl
                        )
                    }
                >
                    <HardDriveDownload className="h-5 w-5" />
                    Download list to device
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.listManager.toggleListInLibraryAsync(
                            type,
                            publicId
                        )
                    }
                >
                    <Library className="h-5 w-5" />
                    {isInLibrary ? "Remove from library" : "Add to library"}
                </PopupMenuOption>
                <PopupMenuOption
                    // disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() =>
                        rockIt.listManager.togglePinListAsync(type, publicId)
                    }
                >
                    {isPinned ? (
                        <PinOff className="h-5 w-5" />
                    ) : (
                        <Pin className="h-5 w-5" />
                    )}
                    {isPinned ? "Unpin from left panel" : "Pin to left panel"}
                </PopupMenuOption>
                {!allSongsInDatabase &&
                    !$downloadedLists.includes(publicId) && (
                        <PopupMenuOption
                            onClick={() =>
                                rockIt.downloaderManager.downloadSpotifyListToDBAsync(
                                    type,
                                    publicId
                                )
                            }
                        >
                            <Download className="h-5 w-5" />
                            Download to server
                        </PopupMenuOption>
                    )}
                {publicId != "last-month" &&
                    publicId != "liked" &&
                    publicId != "most-listened" &&
                    publicId != "recent-mix" &&
                    type == "album" && (
                        <PopupMenuOption
                            onClick={() =>
                                rockIt.listManager.downloadListZipAsync(
                                    type,
                                    publicId
                                )
                            }
                        >
                            <HardDriveDownloadIcon className="h-5 w-5" />
                            Download ZIP
                        </PopupMenuOption>
                    )}
            </PopupMenuContent>
        </PopupMenu>
    );
}
