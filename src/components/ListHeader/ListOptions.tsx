import {
    database,
    queue,
    queueIndex,
    saveSongToIndexedDB,
} from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import {
    Download,
    HardDriveDownload,
    Heart,
    Library,
    ListEnd,
    ListStart,
    Menu,
    Pin,
    PinOff,
    Play,
} from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { downloadedLists, downloads } from "@/stores/downloads";
import { libraryLists } from "@/stores/libraryLists";
import { pinnedLists } from "@/stores/pinnedLists";
import { playListHandleClick } from "../PlayList";
import { downloadFile, downloadRsc } from "@/lib/downloadResources";

export const pinListHandleClick = ({
    id,
    type,
}: {
    id: string;
    type: string;
}) => {
    // Determina si el elemento ya está en la lista
    const isPinned = pinnedLists.get().some((list) => list.id === id);

    if (isPinned) {
        // Si ya está en la lista, elimínalo
        fetch(`/api/unpin/${type}/${id}`, { method: "DELETE" })
            .then((response) => response.json())
            .then(() => {
                const updatedLists = pinnedLists
                    .get()
                    .filter((list) => list.id !== id);
                pinnedLists.set(updatedLists);
            });
    } else {
        // Si no está en la lista, añádelo
        fetch(`/api/pin/${type}/${id}`, { method: "POST" })
            .then((response) => response.json())
            .then((data) => {
                pinnedLists.set([...pinnedLists.get(), data]);
            });
    }
};

export const addToLibraryHandleClick = ({
    id,
    type,
}: {
    id: string;
    type: string;
}) => {
    const isInLibrary = libraryLists.get().some((list) => list.id === id);

    if (isInLibrary) {
        // Quitar de la biblioteca
        fetch(`/api/remove-list/${type}/${id}`)
            .then((response) => response.json())
            .then(() => {
                const updatedLists = libraryLists
                    .get()
                    .filter((list) => list.id !== id);
                libraryLists.set(updatedLists);
            });
    } else {
        // Agregar a la biblioteca
        fetch(`/api/add-list/${type}/${id}`)
            .then((response) => response.json())
            .then((data) => {
                libraryLists.set([...libraryLists.get(), data]);
            });
    }
};

export default function ListOptions({
    type,
    id,
    image,
    inDatabase,
    url,
}: {
    url: string;
    inDatabase: boolean;
    type: string;
    id: string;
    image?: string;
}) {
    const $songs = useStore(currentListSongs);

    const $libraryLists = useStore(libraryLists);
    const isInLibrary = $libraryLists.some((list) => list.id === id);

    // Determina si el elemento ya está en la lista
    const $pinnedLists = useStore(pinnedLists);
    const isPinned = $pinnedLists.some((list) => list.id === id);

    const $downloadedLists = useStore(downloadedLists);

    const addListToBottomQueue = () => {
        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = $songs.map((song, index) => {
            return {
                song: song,
                list: { type, id },
                index:
                    Math.max(...tempQueue.map((_song) => _song.index)) +
                    index +
                    1,
            };
        });
        queue.set([...tempQueue, ...songsToAdd]);
    };
    const addListToTopQueue = () => {
        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = $songs.map((song, index) => {
            return {
                song: song,
                list: { type, id },
                index:
                    Math.max(...tempQueue.map((_song) => _song.index)) +
                    index +
                    1,
            };
        });
        const index = tempQueue.findIndex(
            (_song) => _song.index == queueIndex.get()
        );

        queue.set([
            ...tempQueue.slice(0, index + 1),
            ...songsToAdd,
            ...tempQueue.slice(index + 1),
        ]);
    };

    const likeAllSongs = () => {
        $songs.map((song) => {
            fetch(`/api/like/${song.id}`, { method: "POST" }).then(
                (response) => {
                    if (response.ok) {
                        // Add song to liked songs store
                        likedSongs.set([...likedSongs.get(), song.id]);
                    } else {
                        console.log("Error");
                        // Tell user like request was unsuccessful
                    }
                }
            );
        });
    };

    const downloadListToDevice = async () => {
        console.warn("to do");

        currentListSongs.get().map((song) => {
            saveSongToIndexedDB(song);
        });

        if (!database) return;

        const imageBlob = await fetch(`/api/image/${image}`).then((response) =>
            response.blob()
        );

        const imageToSave = {
            id: image,
            blob: imageBlob,
        };

        await downloadFile(`/${type}/${id}`, database);
        await downloadRsc(`/${type}/${id}`, database);

        const imagesTx = database.transaction("images", "readwrite");
        const imagesStore = imagesTx.objectStore("images");
        imagesStore.put(imageToSave);

        console.log("List downloaded!")

    };

    const downloadListToDB = () => {
        fetch(`/api/start-download?url=${url}`).then((response) => {
            response.json().then((data) => {
                downloads.set([data.download_id, ...downloads.get()]);
            });
        });
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger className="pt-[2px]">
                <Menu strokeWidth={1.3} className="h-6 w-6 cursor-pointer" />
            </PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() => playListHandleClick({ type, id })}
                >
                    <Play className="h-5 w-5" />
                    Play list
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={likeAllSongs}
                >
                    <Heart className="h-5 w-5" />
                    Like all songs on the list
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={addListToTopQueue}
                >
                    <ListStart className="h-5 w-5" />
                    Add list to top of queue
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={addListToBottomQueue}
                >
                    <ListEnd className="h-5 w-5" />
                    Add list to bottom of queue
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={downloadListToDevice}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    Download list to device
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() => addToLibraryHandleClick({ id, type })}
                >
                    <Library className="h-5 w-5" />
                    {isInLibrary ? "Remove from library" : "Add to library"}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!inDatabase && !$downloadedLists.includes(id)}
                    onClick={() => pinListHandleClick({ id, type })}
                >
                    {isPinned ? (
                        <PinOff className="h-5 w-5" />
                    ) : (
                        <Pin className="h-5 w-5" />
                    )}
                    {isPinned ? "Unpin from left panel" : "Pin to left panel"}
                </PopupMenuOption>
                {!inDatabase && !$downloadedLists.includes(id) && (
                    <PopupMenuOption onClick={downloadListToDB}>
                        <Download className="h-5 w-5" />
                        Download to server
                    </PopupMenuOption>
                )}
            </PopupMenuContent>
        </PopupMenu>
    );
}
