"use client";

import { downloads, status } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import React, {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
} from "react";
import {
    Download,
    ArrowDownToLine,
    Copy,
    Pin,
    ListPlus,
    PlayCircle,
    ExternalLink,
    ListEnd,
} from "lucide-react";

import type {
    SpotifyAlbum,
    SpotifyAlbumImage,
    SpotifyArtist,
} from "@/types/spotify";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenuOption from "@/components/ContextMenu/Option";
import { playListHandleClick } from "@/components/PlayList";
import { currentListSongs } from "@/stores/currentList";
import type { SongDB } from "@/db/song";
import { libraryLists } from "@/stores/libraryLists";
import { pinnedLists } from "@/stores/pinnedLists";
import { langData } from "@/stores/lang";
import useWindowSize from "@/hooks/useWindowSize";
import {
    addToLibraryHandleClick,
    pinListHandleClick,
} from "@/components/ListHeader/ListOptions";
import Image from "@/components/Image";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EventSourceStatus {
    message: string;
    completed: number;
    song: {
        name: string;
        artists: SpotifyArtist[];
        album: SpotifyAlbum;
        id: string;
    };
    index?: number;
}

type ListInfo = {
    id: string;
    artists: SpotifyArtist[];
    images: SpotifyAlbumImage[];
    name: string;
    type: "playlist" | "album";
};

function RenderListDownload({
    setOpen,
    list,
}: {
    setOpen: Dispatch<React.SetStateAction<boolean>>;
    list: [
        string,
        {
            listInfo: ListInfo;
            listError: number;
            totalCompleted: number;
            songs: {
                [key: string]: EventSourceStatus;
            };
        },
    ];
}) {
    const [showAllSongs, setShowAllSongs] = useState(false);

    const songs = Object.entries(list[1].songs);

    const sortedSongs = songs.toSorted((a, b) => {
        if (a[1].completed === 100 && b[1].completed !== 100) return 1; // Move completed to the end
        if (a[1].completed !== 100 && b[1].completed === 100) return -1;
        return b[1].completed - a[1].completed; // Otherwise, sort normally
    });

    songs.map((song) => {
        song[1].index = sortedSongs.indexOf(song);
    });

    return (
        <div className="flex max-w-full min-w-0 flex-col rounded bg-zinc-400/10">
            <div className="flex h-16 max-w-full min-w-0 flex-row gap-2">
                <Image
                    alt={list[1].listInfo.name}
                    src={list[1].listInfo.images[0].url}
                    className="aspect-square h-full w-auto rounded object-cover"
                />
                <div className="flex w-full max-w-full min-w-0 flex-col pr-1">
                    <Link
                        onClick={() => {
                            setOpen(false);
                        }}
                        className="truncate text-base font-semibold md:hover:underline"
                        href={
                            "/" +
                            list[1].listInfo.type +
                            "/" +
                            list[1].listInfo.id
                        }
                    >
                        {list[1].listInfo.name}
                    </Link>
                    <label className="truncate text-sm">
                        {list[1].listInfo.artists
                            .map((artist) => artist.name || artist)
                            .join(", ")}
                    </label>
                    <div className="flex flex-row items-center gap-2">
                        <div
                            className={
                                "progress-bar relative h-2 w-full overflow-hidden rounded-full"
                            }
                        >
                            <div
                                className="absolute h-full rounded-full bg-red-700 transition-all"
                                style={{
                                    width: `calc(${list[1].listError}% + 20px)`,
                                    left: `calc(${list[1].totalCompleted}% - 20px)`,
                                }}
                            ></div>
                            <div
                                className={
                                    "absolute h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-all"
                                }
                                style={{ width: `${list[1].totalCompleted}%` }}
                            ></div>
                        </div>
                        <label className="text-sm font-semibold">
                            {Math.round(
                                (list[1].totalCompleted + list[1].listError) *
                                    10
                            ) / 10}
                            %
                        </label>
                    </div>{" "}
                </div>
            </div>
            <label
                className="p-1 text-sm text-blue-500 select-none md:hover:underline"
                onClick={() => {
                    setShowAllSongs((value) => !value);
                }}
            >
                Show {showAllSongs ? "less" : "more"}
            </label>
            <div
                className="overflow-auto transition-all"
                style={{ maxHeight: `${showAllSongs ? 400 : 0}px` }}
            >
                <div
                    className="relative flex flex-col gap-2 p-1"
                    style={{
                        height: `${
                            Object.entries(list[1].songs).length * 60
                        }px`,
                    }}
                >
                    {Object.entries(list[1].songs).map((songStatus) => (
                        <div
                            key={songStatus[0]}
                            className="absolute flex h-14 w-[calc(100%_-_10px)] flex-row gap-x-2 overflow-hidden rounded bg-zinc-400/10 transition-[top] duration-500"
                            style={{
                                top: `${(songStatus[1].index || 0) * 60}px`,
                                transitionTimingFunction:
                                    "cubic-bezier(1,-0.53, 0.09, 1.58)",
                            }}
                        >
                            <div className="flex w-full max-w-full min-w-0 flex-col p-1 px-2">
                                <Link
                                    className="max-w-full min-w-0 truncate"
                                    href={
                                        songStatus[1].song?.id
                                            ? `/song/${songStatus[1].song.id}`
                                            : ""
                                    }
                                >
                                    {songStatus[1].song?.name}
                                </Link>
                                <div className="grid w-full grid-cols-[1fr_max-content] items-center gap-x-2">
                                    <div
                                        className={
                                            "relative h-2 w-full rounded-full " +
                                            (songStatus[1].message == "Error"
                                                ? " bg-red-700"
                                                : " progress-bar")
                                        }
                                    >
                                        {songStatus[1].message != "Error" && (
                                            <div
                                                className="absolute h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-all"
                                                style={{
                                                    width: `${songStatus[1].completed}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                    <label className="w-auto flex-nowrap text-sm">
                                        {" "}
                                        {songStatus[1].message}
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RenderSongDownload({
    songStatus,
    setOpen,
}: {
    songStatus: [string, EventSourceStatus];
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    return (
        <Link
            className="flex h-14 min-h-14 cursor-pointer flex-row gap-x-2 overflow-hidden rounded bg-zinc-400/10 md:hover:bg-zinc-400/30"
            href={`/song/${songStatus[1].song.id}`}
            onClick={() => {
                setOpen(false);
            }}
        >
            <Image
                alt={songStatus[1].song?.name}
                width={64}
                height={64}
                src={
                    songStatus[1].song?.album?.images[0]?.url ||
                    "/song-placeholder.png"
                }
                className="aspect-square h-full w-auto object-cover"
            />
            <div className="flex w-full max-w-full min-w-0 flex-col p-1 pr-2">
                <label className="max-w-full min-w-0 truncate">
                    {songStatus[1].song?.name} -{" "}
                    {songStatus[1].song?.artists
                        .map((artist) => artist.name || artist)
                        .join(", ")}
                </label>
                <div className="grid w-full grid-cols-[1fr_max-content] items-center gap-x-2">
                    <div
                        className={
                            "progress-bar relative h-2 w-full rounded-full " +
                            (songStatus[1].message == "Error" && "bg-red-400")
                        }
                    >
                        <div
                            className={
                                "absolute h-full rounded-full transition-all " +
                                (songStatus[1].message == "Error"
                                    ? " bg-red-400"
                                    : " bg-gradient-to-r from-[#ee1086] to-[#fb6467]")
                            }
                            style={{ width: `${songStatus[1].completed}%` }}
                        ></div>
                    </div>
                    <label className="w-auto flex-nowrap text-sm">
                        {" "}
                        {songStatus[1].message}
                    </label>
                </div>
            </div>
        </Link>
    );
}

function AddContextMenu({
    children,
    song,
    list,
}: {
    children: ReactNode;
    song?: [string, EventSourceStatus] | undefined;
    list?:
        | [
              string,
              {
                  listInfo: ListInfo;
                  listError: number;
                  totalCompleted: number;
                  songs: {
                      [key: string]: EventSourceStatus;
                  };
              },
          ]
        | undefined;
}) {
    let isInLibrary;
    let isPinned;

    const $libraryLists = useStore(libraryLists);
    const $pinnedLists = useStore(pinnedLists);
    if (list) {
        isInLibrary = $libraryLists.some(
            (_list) => _list.id === list[1].listInfo.id
        );

        // Determina si el elemento ya está en la lista
        isPinned = $pinnedLists.some(
            (_list) => _list.id === list[1].listInfo.id
        );
    }

    const router = useRouter();

    const $lang = useStore(langData);

    if (!song && !list) {
        return <>{children}</>;
    }
    if (!$lang) return false;

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption
                    onClick={async () => {
                        if (list) {
                            if (list[1].totalCompleted) {
                                const response = await fetch(
                                    `/api/songs1?songs=${Object.entries(
                                        list[1].songs
                                    )
                                        .map(
                                            (songStatus) =>
                                                songStatus[1].song.id
                                        )
                                        .join()}&q=id,name,artists,duration,albumName,albumId,path,image`
                                );

                                if (response.ok) {
                                    const songs =
                                        (await response.json()) as SongDB<
                                            | "id"
                                            | "name"
                                            | "artists"
                                            | "duration"
                                            | "albumName"
                                            | "albumId"
                                            | "path"
                                            | "image"
                                        >[];

                                    currentListSongs.set(songs);

                                    playListHandleClick({
                                        type: list[1].listInfo.type,
                                        id: list[1].listInfo.id,
                                    });
                                }
                            } else {
                                // Notify that the list is still downloading
                            }
                        }
                    }}
                >
                    <PlayCircle className="h-5 w-5" />
                    {list && $lang.play_list} {song && $lang.play_song}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        if (list) {
                            router?.push(
                                `/${list[1].listInfo.type}/${list[1].listInfo.id}`
                            );
                        } else if (song) {
                            router?.push(`/song/${song[1].song.id}`);
                        }
                    }}
                >
                    <ExternalLink className="h-5 w-5" />
                    {list && $lang.open_list} {song && $lang.open_song}
                </ContextMenuOption>

                <ContextMenuOption className="pointer-events-none opacity-50">
                    <ListEnd className="h-5 w-5" />
                    {list && $lang.add_list_to_queue}
                    {song && $lang.add_song_to_queue}
                </ContextMenuOption>
                {list && (
                    <ContextMenuOption
                        onClick={() => {
                            addToLibraryHandleClick({
                                id: list[1].listInfo.id,
                                type: list[1].listInfo.type,
                            });
                        }}
                    >
                        <ListPlus className="h-5 w-5" />
                        {isInLibrary
                            ? $lang.remove_from_library
                            : $lang.add_to_library}
                    </ContextMenuOption>
                )}
                {list && (
                    <ContextMenuOption
                        onClick={() => {
                            pinListHandleClick({
                                id: list[1].listInfo.id,
                                type: list[1].listInfo.type,
                            });
                        }}
                    >
                        <Pin className="h-5 w-5" />
                        {isPinned ? $lang.unpin : $lang.pin}
                    </ContextMenuOption>
                )}
                {song && (
                    <ContextMenuOption className="pointer-events-none opacity-50">
                        <Download className="h-5 w-5" />
                        {$lang.download_mp3}
                    </ContextMenuOption>
                )}
                <ContextMenuOption
                    onClick={() => {
                        if (!navigator.clipboard) {
                            // Alert user clipboard isn't available.
                            return;
                        }
                        if (song?.[1].song?.id) {
                            navigator.clipboard.writeText(
                                location.origin + `/song/${song[1].song?.id}`
                            );
                        } else if (list) {
                            navigator.clipboard.writeText(
                                location.origin +
                                    `/${list[1].listInfo.type}/${list[1].listInfo.id}`
                            );
                        }
                    }}
                >
                    <Copy className="h-5 w-5" />
                    {list && $lang.copy_list_url} {song && $lang.copy_song_url}
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function DownloadIcon({
    setOpen,
    downloadsButton,
}: {
    downloadsButton?: React.RefObject<HTMLDivElement | null>;
    setOpen?: Dispatch<React.SetStateAction<boolean>>;
}) {
    const $downloads = useStore(downloads);

    const router = useRouter();

    const $lang = useStore(langData);
    if (!$lang) return false;
    return (
        <div
            title="Downloads"
            className={`mr-2 ml-2 flex h-8 items-center gap-2 rounded-md transition-all md:flex md:hover:bg-[#414141]`}
            onClick={() => {
                if (innerWidth > 768) {
                    if (setOpen) {
                        setOpen((value) => !value);
                    } else {
                        console.error("setopen if false but innerWidth > 768");
                    }
                } else {
                    router.push("/downloads");
                }
            }}
            ref={downloadsButton}
        >
            <div className="relative flex h-8 w-8 items-center justify-center">
                <Download className="h-5 w-5" />
                {$downloads.length > 0 && (
                    <label className="absolute top-0 right-0 aspect-square h-4 w-auto rounded-full bg-red-500 text-center text-xs">
                        {$downloads.length}
                    </label>
                )}
            </div>
            <label className="hidden font-semibold md:block">
                {$lang.downloads}{" "}
            </label>
        </div>
    );
}

export function Downloads({ navOpen = false }: { navOpen?: boolean }) {
    const [open, setOpen] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);
    const downloadsButton = useRef<HTMLDivElement>(null);

    const $status = useStore(status);

    const [url, setURL] = useState("");

    const innerWidth = useWindowSize().width;

    useEffect(() => {
        if (!divRef.current || !downloadsButton.current) {
            return;
        }
        const handleDocumentClick = (event: MouseEvent) => {
            if (
                !divRef.current?.contains(event?.target as Node) &&
                !downloadsButton.current?.contains(event?.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [divRef, downloadsButton]);

    const handleStartDownload = () => {
        fetch(`/api/start-download?url=${url}`).then((response) => {
            response.json().then((data) => {
                downloads.set([data.download_id, ...downloads.get()]);
            });
        });
    };

    const $lang = useStore(langData);
    if (!$lang) return false;

    if (!innerWidth) return;

    if (innerWidth < 768) {
        return (
            <div className="mb-20 flex w-full flex-col gap-1 px-2 pt-20">
                <label className="px-2 text-center text-3xl font-bold">
                    Music Downloader
                </label>
                <div className="mx-auto flex w-4/5 flex-row items-center gap-x-1">
                    <input
                        type="search"
                        className="my-2 w-full rounded-full px-4 py-2 focus:outline-0"
                        placeholder={$lang.download_input_placeholder}
                        value={url}
                        onChange={(e) => {
                            setURL(e.target.value);
                        }}
                    />
                    <div
                        className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800"
                        onClick={handleStartDownload}
                    >
                        <ArrowDownToLine className="h-5 w-5 text-white" />
                    </div>
                </div>
                {Object.entries($status.songs)
                    .toReversed()
                    .map((songStatus) => (
                        <AddContextMenu key={songStatus[0]} song={songStatus}>
                            <RenderSongDownload
                                songStatus={songStatus}
                                setOpen={setOpen}
                            />
                        </AddContextMenu>
                    ))}
                {Object.entries($status.lists)
                    .toReversed()
                    .map((list) => (
                        <AddContextMenu key={list[0]} list={list}>
                            <RenderListDownload list={list} setOpen={setOpen} />
                        </AddContextMenu>
                    ))}
            </div>
        );
    }

    return (
        <>
            <div
                ref={divRef}
                className={`absolute bottom-24 z-40 flex h-3/4 w-96 flex-col gap-2 overflow-auto rounded-tr-3xl bg-black/50 bg-gradient-to-r p-2 shadow-lg transition-all duration-[400ms] ${
                    navOpen ? "left-56" : "left-12"
                }`}
                style={{
                    clip: open
                        ? "rect(0px, 24rem, 1000px, 0px)"
                        : "rect(0px, 0rem, 1000px, 0px)",
                }}
            >
                {/* Logos */}
                <div className="mt-5 flex justify-center gap-6">
                    <Image
                        width={30}
                        height={30}
                        src="/youtube-music-logo.svg"
                        alt="YouTube Music Logo"
                        className="h-6 object-contain"
                    />
                    <Image
                        width={30}
                        height={30}
                        src="/spotify-logo.png"
                        alt="Spotify Logo"
                        className="h-7 object-contain"
                    />
                </div>

                {/* Label */}
                <label className="py-3 text-center text-3xl font-extrabold">
                    Music Downloader
                </label>

                <div className="mx-auto flex flex-row items-center">
                    {/* Input */}
                    <input
                        type="search"
                        className="my-2 mr-3 w-64 rounded-full px-4 py-2 focus:outline-0"
                        placeholder={$lang.download_input_placeholder}
                        value={url}
                        onChange={(e) => {
                            setURL(e.target.value);
                        }}
                    />

                    {/* Download Button */}
                    <div
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800"
                        onClick={handleStartDownload}
                    >
                        <ArrowDownToLine className="h-5 w-5 text-white" />
                    </div>

                    {/* Toggle switch - Por si en un futuro lo implementamos
                    <div className="flex items-center gap-2 my-5">
                        <span className="text-white font-semibold">Auto-Like all the songs?</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-neutral-300 rounded-full peer peer-focus:ring-3 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 peer-checked:bg-green-600"></div>
                            <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></span>
                        </label>
                    </div>*/}
                </div>
                <div className="mb-4 flex items-center justify-between">
                    {Object.entries(status).length != 0 && (
                        <label className="text-lg font-bold text-white">
                            {$lang.latest_downloads}
                        </label>
                    )}

                    <button
                        className="mr-2 text-sm text-blue-500 md:hover:underline"
                        onClick={() => {
                            // Lógica para limpiar los downloads
                            console.log("Clear downloads clicked");
                        }}
                    >
                        {$lang.clear_downloads}
                    </button>
                </div>

                {Object.entries($status.songs)
                    .toReversed()
                    .map((songStatus) => (
                        <AddContextMenu key={songStatus[0]} song={songStatus}>
                            <RenderSongDownload
                                songStatus={songStatus}
                                setOpen={setOpen}
                            />
                        </AddContextMenu>
                    ))}
                {Object.entries($status.lists)
                    .toReversed()
                    .map((list) => (
                        <AddContextMenu key={list[0]} list={list}>
                            <RenderListDownload list={list} setOpen={setOpen} />
                        </AddContextMenu>
                    ))}
            </div>
            <div className="hidden md:block">
                <DownloadIcon
                    setOpen={setOpen}
                    downloadsButton={downloadsButton}
                ></DownloadIcon>
            </div>
        </>
    );
}
