"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import Image from "@/components/Image";
import { useEffect, useMemo } from "react";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import useWindowSize from "@/hooks/useWindowSize";
import useFetch from "@/hooks/useFetch";
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
import { SongDB } from "@/lib/db/song";
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

async function getListSongs(list: PlaylistDB | AlbumDB) {
    if (list.type == "playlist") {
        const response = await fetch(
            `/api/songs1?songs=${list.songs
                .map((song) => song.id)
                .join()}&p=id,image,name,artists,path,duration,albumName,albumId`
        );
        const songs = (await response.json()) as SongDB<
            | "id"
            | "image"
            | "name"
            | "artists"
            | "path"
            | "duration"
            | "albumName"
            | "albumId"
        >[];
        return songs;
    } else if (list.type == "album") {
        const response = await fetch(
            `/api/songs1?songs=${list.songs.join()}&p=id,image,name,artists,path,duration,albumName,albumId`
        );
        const songs = (await response.json()) as SongDB<
            | "id"
            | "image"
            | "name"
            | "artists"
            | "path"
            | "duration"
            | "albumName"
            | "albumId"
        >[];
        return songs;
    } else {
        console.warn("Unknown list type:", list);
    }
}

function AddListContextMenu({
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
                <ContextMenuOption
                    onClick={() =>
                        downloadListZip({ id: list.id, type: list.type })
                    }
                >
                    <HardDriveDownload className="h-5 w-5" />
                    Download ZIP
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function LibraryLists({
    filterMode,
    searchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    searchQuery: string;
}) {
    const { width } = useWindowSize();
    const $lang = useStore(langData);

    const [data, updateLists] = useFetch<{
        playlists: PlaylistDB[];
        albums: AlbumDB[];
    }>("/api/library/lists");

    useEffect(() => {
        return libraryLists.listen(() => {
            updateLists();
        });
    }, [updateLists]);

    const playlists = data?.playlists;
    const albums = data?.albums;

    const filteredPlaylists = useMemo(() => {
        if (!playlists) return;

        let result = playlists.filter((pl) =>
            pl.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [playlists, filterMode, searchQuery]);

    const filteredAlbums = useMemo(() => {
        if (!albums) return;

        let result = albums.filter((al) => {
            const matchesName = al.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesArtist = al.artists.some((artist) =>
                artist.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return matchesName || matchesArtist;
        });

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [albums, filterMode, searchQuery]);

    if (!width || !$lang || !filteredPlaylists || !filteredAlbums) return null;

    return (
        <section>
            <h2 className="px-5 py-4 text-left text-2xl font-bold md:px-0">
                {$lang.your_albums_playlists}
            </h2>
            <div
                className="grid gap-x-5 gap-y-3 px-5"
                style={{
                    gridTemplateColumns:
                        width < 768
                            ? "repeat(auto-fill, minmax(40%, 1fr))"
                            : "repeat(auto-fill, minmax(200px, 1fr))",
                }}
            >
                <NewPlaylistButton />

                {filteredPlaylists.map((playlist, index) => (
                    <AddListContextMenu
                        key={"playlist" + index}
                        list={playlist}
                    >
                        <Link
                            href={`/playlist/${playlist.id}`}
                            className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                        >
                            <Image
                                alt={playlist.name}
                                className="cover aspect-square h-auto w-full rounded-md"
                                src={getImageUrl({
                                    imageId: playlist.image,
                                    height: 300,
                                    width: 300,
                                    fallback: playlist.images?.[0]?.url,
                                    placeHolder:
                                        "/api/image/rockit-background.png",
                                })}
                            />
                            <label className="min-h-6 truncate text-center font-semibold">
                                {playlist.name}
                            </label>
                            <label className="min-h-5 truncate text-center text-sm text-gray-400">
                                {playlist.owner}
                            </label>
                        </Link>
                    </AddListContextMenu>
                ))}

                {filteredAlbums.map((album, index) => (
                    <AddListContextMenu key={"album" + index} list={album}>
                        <Link
                            key={"album" + index}
                            href={`/album/${album.id}`}
                            className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                        >
                            <Image
                                alt={album.name}
                                className="cover aspect-square h-auto w-full rounded-md"
                                src={getImageUrl({
                                    imageId: album.image,
                                    height: 300,
                                    width: 300,
                                    fallback: album.images[0]?.url,
                                    placeHolder:
                                        "/api/image/song-placeholder.png",
                                })}
                            />
                            <label className="mt-1 truncate text-center font-semibold">
                                {album.name}
                            </label>
                            <div className="mx-auto flex max-w-full flex-row truncate text-center text-sm text-gray-400">
                                {album.artists.map((artist, i) => (
                                    <label
                                        key={album.id + artist.id}
                                        className="truncate md:hover:underline"
                                    >
                                        {artist.name}
                                        {i < album.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </label>
                                ))}
                            </div>
                        </Link>
                    </AddListContextMenu>
                ))}
            </div>
            <div className="min-h-10" />
        </section>
    );
}
