"use client";

import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { useStore } from "@nanostores/react";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenuOption from "../ContextMenu/Option";
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
import { libraryLists } from "@/stores/libraryLists";
import { playListHandleClick } from "../PlayList";
import { currentListSongs } from "@/stores/currentList";
import {
    database,
    queue,
    queueIndex,
    saveSongToIndexedDB,
} from "@/stores/audio";
import { downloadFile, downloadRsc } from "@/lib/downloadResources";
import ContextMenuSplitter from "../ContextMenu/Splitter";
import { pinnedLists } from "@/stores/pinnedLists";
import { downloadListZip, pinListHandleClick } from "../ListHeader/ListOptions";
import { getListSongs } from "./getListSongs";

export function AddListContextMenu({
    children,
    list,
}: {
    children: React.ReactNode;
    list: PlaylistDB | AlbumDB;
}) {
    const $pinnedLists = useStore(pinnedLists);

    const addListToTopQueue = async () => {
        const songs = await getListSongs(list);

        if (!songs) {
            console.warn("addListToTopQueue Songs is undefined");
            return;
        }

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = songs
            .map((song, index) => {
                return {
                    song: song,
                    list: { type: list.type, id: list.id },
                    index:
                        Math.max(...tempQueue.map((_song) => _song.index)) +
                        index +
                        1,
                };
            })
            .filter(
                (queueSong) => queueSong?.song?.id && queueSong?.song?.path
            );
        const index = tempQueue.findIndex(
            (_song) => _song.index == queueIndex.get()
        );

        queue.set([
            ...tempQueue.slice(0, index + 1),
            ...songsToAdd,
            ...tempQueue.slice(index + 1),
        ]);
    };

    const addListToQueueRandomly = async () => {
        const songs = await getListSongs(list);
        if (!songs) {
            console.warn("addListToBottomQueue Songs is undefined");
            return;
        }

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = songs
            .map((song, index) => {
                return {
                    song: song,
                    list: { type: list.type, id: list.id },
                    index:
                        Math.max(...tempQueue.map((_song) => _song.index)) +
                        index +
                        1,
                };
            })
            .filter(
                (queueSong) => queueSong?.song?.id && queueSong?.song?.path
            );
        const index = tempQueue.findIndex(
            (_song) => _song.index == queueIndex.get()
        );

        const queueAfterCurrentIndex = [
            // ...songsToAdd,

            ...tempQueue.slice(index + 1),
        ];

        songsToAdd.forEach((song, i) => {
            // Assign a random index to each song to be added
            const index = Math.floor(
                Math.random() * (queueAfterCurrentIndex.length + i)
            );
            // Insert the song into the queueAfterCurrentIndex at the random index
            queueAfterCurrentIndex.splice(index, 0, song);
        });

        queue.set([
            ...tempQueue.slice(0, index + 1),
            ...queueAfterCurrentIndex,
        ]);
    };

    const addListToBottomQueue = async () => {
        const songs = await getListSongs(list);
        if (!songs) {
            console.warn("addListToBottomQueue Songs is undefined");
            return;
        }
        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = songs
            .map((song, index) => {
                return {
                    song: song,
                    list: { type: list.type, id: list.id },
                    index:
                        Math.max(...tempQueue.map((_song) => _song.index)) +
                        index +
                        1,
                };
            })
            .filter(
                (queueSong) => queueSong?.song?.id && queueSong?.song?.path
            );
        queue.set([...tempQueue, ...songsToAdd]);
    };

    const handlePlay = async () => {
        const songs = await getListSongs(list);
        if (!songs) {
            console.warn("Songs is undefined");
            return;
        }

        currentListSongs.set(songs);

        playListHandleClick({ type: list.type, id: list.id });
    };

    const downloadListToDevice = async () => {
        currentListSongs.get().map((song) => {
            saveSongToIndexedDB(song);
        });

        if (!database) return;

        const imageBlob = await fetch(`/api/image/${list.image}`).then(
            (response) => response.blob()
        );

        const imageToSave = {
            id: list.image,
            blob: imageBlob,
        };

        await downloadFile(`/${list.type}/${list.id}`, database);
        await downloadRsc(`/${list.type}/${list.id}`, database);

        const imagesTx = database.transaction("images", "readwrite");
        const imagesStore = imagesTx.objectStore("images");
        imagesStore.put(imageToSave);

        console.log("List downloaded!");
    };

    const handleRemoveFromLibrary = () => {
        fetch(`/api/remove-list/${list.type}/${list.id}`)
            .then((response) => response.json())
            .then(() => {
                libraryLists.set(
                    libraryLists.get().filter((list) => list.id !== list.id)
                );
            });
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption onClick={handlePlay}>
                    <PlayCircle className="h-5 w-5" />
                    Play {list.type}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption onClick={addListToTopQueue}>
                    <ListStart className="h-5 w-5" />
                    Add list to top of queue
                </ContextMenuOption>
                <ContextMenuOption onClick={addListToQueueRandomly}>
                    <Shuffle className="h-5 w-5" />
                    Add list to queue randomly
                </ContextMenuOption>
                <ContextMenuOption onClick={addListToBottomQueue}>
                    <ListEnd className="h-5 w-5" />
                    Add list to bottom of queue
                </ContextMenuOption>

                <ContextMenuSplitter />

                <ContextMenuOption onClick={handleRemoveFromLibrary}>
                    <Library className="h-5 w-5" />
                    Remove from library
                </ContextMenuOption>
                {$pinnedLists.find((_list) => _list.id == list.id) ? (
                    <ContextMenuOption
                        onClick={() => {
                            pinListHandleClick({
                                id: list.id,
                                type: list.type,
                            });
                        }}
                    >
                        <PinOff className="h-5 w-5" />
                        Unpin
                    </ContextMenuOption>
                ) : (
                    <ContextMenuOption
                        onClick={() => {
                            pinListHandleClick({
                                id: list.id,
                                type: list.type,
                            });
                        }}
                    >
                        <PinIcon className="h-5 w-5" />
                        Pin
                    </ContextMenuOption>
                )}

                <ContextMenuSplitter />

                <ContextMenuOption onClick={downloadListToDevice}>
                    <HardDriveDownload className="h-5 w-5" />
                    Download list to device
                </ContextMenuOption>
                {list.type == "album" && (
                    <ContextMenuOption
                        onClick={() =>
                            downloadListZip({ id: list.id, type: list.type })
                        }
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        Download ZIP
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
