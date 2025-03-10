import { downloads } from "@/stores/downloads";
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
import ContextMenu from "./ContextMenu/ContextMenu";
import ContextMenuTrigger from "./ContextMenu/Trigger";
import ContextMenuContent from "./ContextMenu/Content";
import ContextMenuOption from "./ContextMenu/Option";
import { playListHandleClick } from "./PlayList";
import { currentListSongs } from "@/stores/currentList";
import type { SongDB } from "@/db/song";
import { navigate } from "astro:transitions/client";
import { addToLibraryHandleClick } from "./ListHeader/AddToLibrary";
import { libraryLists } from "@/stores/libraryLists";
import { pinListHandleClick } from "./ListHeader/PinList";
import { pinnedLists } from "@/stores/pinnedLists";
import { langData } from "@/stores/lang";
import { downloadedSongs } from "@/stores/downloadedSongs";
import useWindowSize from "@/hooks/useWindowSize";

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

type StatusType = {
    songs: { [key: string]: EventSourceStatus };
    lists: {
        [key: string]: {
            listInfo: ListInfo;
            totalCompleted: number;
            listError: number;
            songs: { [key: string]: EventSourceStatus };
        };
    };
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

    let songs = Object.entries(list[1].songs);

    let sortedSongs = songs.toSorted((a, b) => {
        if (a[1].completed === 100 && b[1].completed !== 100) return 1; // Move completed to the end
        if (a[1].completed !== 100 && b[1].completed === 100) return -1;
        return b[1].completed - a[1].completed; // Otherwise, sort normally
    });

    songs.map((song) => {
        song[1].index = sortedSongs.indexOf(song);
    });

    return (
        <div className="bg-zinc-400/10 min-w-0 max-w-full flex flex-col rounded">
            <div className="flex flex-row h-16 min-w-0 max-w-full gap-2">
                <img
                    src={list[1].listInfo.images[0].url}
                    className="h-full w-auto rounded"
                />
                <div className="flex flex-col min-w-0 max-w-full w-full pr-1">
                    <a
                        onClick={() => {
                            setOpen(false);
                        }}
                        className="text-base font-semibold truncate md:hover:underline"
                        href={
                            "/" +
                            list[1].listInfo.type +
                            "/" +
                            list[1].listInfo.id
                        }
                    >
                        {list[1].listInfo.name}
                    </a>
                    <label className="text-sm truncate">
                        {list[1].listInfo.artists
                            .map((artist) => artist.name || artist)
                            .join(", ")}
                    </label>
                    <div className="flex flex-row items-center gap-2">
                        <div
                            className={
                                "progress-bar h-2 w-full rounded-full relative overflow-hidden"
                            }
                        >
                            <div
                                className="bg-red-700 absolute h-full rounded-full transition-all"
                                style={{
                                    width: `calc(${list[1].listError}% + 20px)`,
                                    left: `calc(${list[1].totalCompleted}% - 20px)`,
                                }}
                            ></div>
                            <div
                                className={
                                    "from-[#ee1086] to-[#fb6467] bg-gradient-to-r absolute h-full rounded-full transition-all"
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
                className="md:hover:underline text-sm text-blue-500 p-1 select-none"
                onClick={() => {
                    setShowAllSongs((value) => !value);
                }}
            >
                Show {showAllSongs ? "less" : "more"}
            </label>
            <div
                className="overflow-auto transition-all "
                style={{ maxHeight: `${showAllSongs ? 400 : 0}px` }}
            >
                <div
                    className="flex flex-col gap-2 p-1 relative"
                    style={{
                        height: `${Object.entries(list[1].songs).length * 60}px`,
                    }}
                >
                    {Object.entries(list[1].songs)

                        .map((songStatus) => (
                            <div
                                key={songStatus[0]}
                                className="bg-zinc-400/10 absolute w-[calc(100%_-_10px)] transition-[top] duration-500 rounded h-14 flex flex-row gap-x-2 overflow-hidden"
                                style={{
                                    top: `${(songStatus[1].index || 0) * 60}px`,
                                    transitionTimingFunction:
                                        "cubic-bezier(1,-0.53, 0.09, 1.58)",
                                }}
                            >
                                <div className="flex flex-col w-full p-1 px-2 min-w-0 max-w-full">
                                    <a
                                        className="truncate min-w-0 max-w-full"
                                        href={
                                            songStatus[1].song?.id
                                                ? `/song/${songStatus[1].song.id}`
                                                : ""
                                        }
                                    >
                                        {songStatus[1].song?.name}
                                    </a>
                                    <div className="w-full grid grid-cols-[1fr_max-content] items-center gap-x-2 ">
                                        <div
                                            className={
                                                " h-2 w-full rounded-full relative " +
                                                (songStatus[1].message ==
                                                "Error"
                                                    ? " bg-red-700 "
                                                    : " progress-bar ")
                                            }
                                        >
                                            {songStatus[1].message !=
                                                "Error" && (
                                                <div
                                                    className="from-[#ee1086] to-[#fb6467] bg-gradient-to-r absolute h-full rounded-full transition-all"
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
        <a
            className="bg-zinc-400/10 rounded h-14 min-h-14 flex flex-row gap-x-2 overflow-hidden md:hover:bg-zinc-400/30 cursor-pointer"
            href={`/song/${songStatus[1].song.id}`}
            onClick={() => {
                setOpen(false);
            }}
        >
            <img
                src={
                    songStatus[1].song?.album?.images[0]?.url ||
                    "/song-placeholder.png"
                }
                className="h-full w-auto"
            />
            <div className="flex flex-col w-full p-1 pr-2 min-w-0 max-w-full">
                <label className="truncate min-w-0 max-w-full">
                    {songStatus[1].song?.name} -{" "}
                    {songStatus[1].song?.artists
                        .map((artist) => artist.name || artist)
                        .join(", ")}
                </label>
                <div className="w-full grid grid-cols-[1fr_max-content] items-center gap-x-2 ">
                    <div
                        className={
                            "progress-bar h-2 w-full rounded-full relative " +
                            (songStatus[1].message == "Error" && "bg-red-400")
                        }
                    >
                        <div
                            className={
                                "absolute h-full rounded-full transition-all " +
                                (songStatus[1].message == "Error"
                                    ? " bg-red-400 "
                                    : " from-[#ee1086] to-[#fb6467] bg-gradient-to-r ")
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
        </a>
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
    if (!song && !list) {
        return <>{children}</>;
    }

    let isInLibrary;
    let isPinned;

    if (list) {
        const $libraryLists = useStore(libraryLists);

        isInLibrary = $libraryLists.some(
            (_list) => _list.id === list[1].listInfo.id
        );

        const $pinnedLists = useStore(pinnedLists);

        // Determina si el elemento ya está en la lista
        isPinned = $pinnedLists.some(
            (_list) => _list.id === list[1].listInfo.id
        );
    }

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption
                    onClick={async () => {
                        if (list) {
                            if (list[1].totalCompleted) {
                                const response = await fetch(
                                    `/api/songs?songs=${Object.entries(
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
                            navigate(
                                `/${list[1].listInfo.type}/${list[1].listInfo.id}`
                            );
                        } else if (song) {
                            navigate(`/song/${song[1].song.id}`);
                        }
                    }}
                >
                    <ExternalLink className="w-5 h-5" />
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
    downloadsButton?: React.RefObject<HTMLDivElement>;
    setOpen?: Dispatch<React.SetStateAction<boolean>>;
}) {
    const $downloads = useStore(downloads);

    const $lang = useStore(langData);
    if (!$lang) return;
    return (
        <div
            title="Downloads"
            className={`h-8 rounded-md items-center ml-2 mr-2 transition-all gap-2 md:hover:bg-[#414141] md:flex flex`}
            onClick={() => {
                if (innerWidth > 768) {
                    if (setOpen) {
                        setOpen((value) => !value);
                    } else {
                        console.error("setopen if false but innerWidth > 768");
                    }
                } else {
                    navigate("/downloads");
                }
            }}
            ref={downloadsButton}
        >
            <div className="w-8 h-8 flex items-center justify-center relative">
                <Download className="w-5 h-5" />
                {$downloads.length > 0 && (
                    <label className="absolute text-xs bg-red-500 rounded-full top-0 right-0 aspect-square w-auto h-4 text-center ">
                        {$downloads.length}
                    </label>
                )}
            </div>
            <label className="font-semibold hidden md:block">
                {$lang.downloads}{" "}
            </label>
        </div>
    );
}

export function Downloads({ navOpen = false }: { navOpen?: boolean }) {
    const [open, setOpen] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);
    const downloadsButton = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<StatusType>({ songs: {}, lists: {} });

    const $downloads = useStore(downloads);

    const [url, setURL] = useState("");

    const eventSources = useRef<string[]>([]);

    const songs: {
        [key: string]: {
            name: string;
            artists: SpotifyArtist[];
            album: SpotifyAlbum;
            id: string;
        };
    } = {};

    const lists: { [key: string]: ListInfo } = {};

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

    const onMessage = (event: MessageEvent<any>, eventSource: EventSource) => {
        const message = JSON.parse(event.data);
        if (message.song && !songs[message.song.id]) {
            songs[message.song.id] = message.song;
        }
        if (message.list) {
            lists[message.list.id] = message.list;
        }
        if (message.list_id == undefined) {
            setStatus((value: StatusType) => {
                let newValue = { ...value };
                if (message.id == undefined) {
                } else {
                    newValue.songs[message.id] = {
                        completed: message.completed,
                        message: message.message,
                        song: songs[message.id],
                    };
                }
                return newValue;
            });
            if (message.completed == 100) {
                downloadedSongs.set([...downloadedSongs.get(), message.id]);
                eventSource.close();
            }
            // {"id": "0vlCOzte4bru0gK74lfUIJ", "completed": 63, "message": "Converting", "list_completed": 79.55555555555556, "list_error": 0.0, "list_id": "2xQBCPq2gQ7l8thLUUZSKu"}
        } else {
            setStatus((value: StatusType) => {
                let newValue = { ...value };
                if (newValue.lists[message.list_id] == undefined) {
                    newValue.lists[message.list_id] = {
                        listInfo: lists[message.list_id],
                        totalCompleted: message.list_completed,
                        songs: {},
                        listError: message.list_error,
                    };
                } else {
                    newValue.lists[message.list_id].listInfo =
                        lists[message.list_id];
                    newValue.lists[message.list_id].totalCompleted =
                        message.list_completed;
                    newValue.lists[message.list_id].listError =
                        message.list_error;
                }
                newValue.lists[message.list_id].songs[message.id] = {
                    completed: message.completed,
                    message: message.message,
                    song: songs[message.id],
                };
                if (message.completed == 100) {
                    downloadedSongs.set([...downloadedSongs.get(), message.id]);
                }

                return newValue;
            });
            if (
                Math.round(
                    (message.list_completed + message.list_error) * 100
                ) /
                    100 ==
                100
            ) {
                eventSource.close();
            }
        }
    };

    useEffect(() => {
        for (let downloadId of $downloads) {
            if (eventSources.current.includes(downloadId)) {
                console.log("Skipping id", downloadId);
                continue;
            }
            eventSources?.current?.push(downloadId);
            const eventSource = new EventSource(
                `/api/download-status/${downloadId}`
            );
            eventSource.onmessage = (event) => {
                onMessage(event, eventSource);
            };
            eventSource.onerror = (error) => {
                eventSources.current = eventSources.current?.filter(
                    (id) => id != downloadId
                );
                console.error("EventSource failed:", error);
                eventSource.close();
            };
        }
    }, [$downloads]);

    const handleStartDownload = () => {
        fetch(`/api/start-download?url=${url}`).then((response) => {
            response.json().then((data) => {
                downloads.set([data.download_id, ...downloads.get()]);
            });
        });
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    if (innerWidth < 768) {
        return (
            <div className="w-full  pt-20 mb-20 px-2 flex flex-col gap-1">
                <label className="text-3xl font-bold text-center px-2">
                    Music Downloader
                </label>
                <div className="flex flex-row w-4/5 mx-auto items-center gap-x-1">
                    <input
                        type="search"
                        className="focus:outline-0 py-2 my-2 px-4 w-full rounded-full"
                        placeholder={$lang.download_input_placeholder}
                        value={url}
                        onChange={(e) => {
                            setURL(e.target.value);
                        }}
                    />
                    <div
                        className="min-w-9 min-h-9 flex items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800 cursor-pointer"
                        onClick={handleStartDownload}
                    >
                        <ArrowDownToLine className="w-5 h-5 text-white" />
                    </div>
                </div>
                {Object.entries(status.songs)
                    .toReversed()
                    .map((songStatus) => (
                        <AddContextMenu key={songStatus[0]} song={songStatus}>
                            <RenderSongDownload
                                songStatus={songStatus}
                                setOpen={setOpen}
                            />
                        </AddContextMenu>
                    ))}
                {Object.entries(status.lists)
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
                className={`w-96 bg-gradient-to-r from-[#000000] to-[#000000d5] h-3/4 flex flex-col gap-2 shadow-lg p-2 rounded-tr-3xl absolute bottom-24 transition-all duration-[400ms] overflow-auto z-40 ${
                    navOpen ? "left-56" : "left-12"
                }`}
                style={{
                    clip: open
                        ? "rect(0px, 24rem, 1000px, 0px)"
                        : "rect(0px, 0rem, 1000px, 0px)",
                }}
            >
                {/* Logos */}
                <div className="flex justify-center gap-6 mt-5">
                    <img
                        src="/youtube-music-logo.svg"
                        alt="YouTube Music Logo"
                        className="h-6 object-contain"
                    />
                    <img
                        src="/spotify-logo.png"
                        alt="Spotify Logo"
                        className="h-7 object-contain"
                    />
                </div>

                {/* Label */}
                <label className="text-3xl font-extrabold text-center py-3">
                    Music Downloader
                </label>

                <div className="flex flex-row items-center mx-auto">
                    {/* Input */}
                    <input
                        type="search"
                        className="focus:outline-0 py-2 my-2 px-4 rounded-full mr-3 w-64"
                        placeholder={$lang.download_input_placeholder}
                        value={url}
                        onChange={(e) => {
                            setURL(e.target.value);
                        }}
                    />

                    {/* Download Button */}
                    <div
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800 cursor-pointer"
                        onClick={handleStartDownload}
                    >
                        <ArrowDownToLine className="w-5 h-5 text-white" />
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
                <div className="flex items-center justify-between mb-4">
                    {Object.entries(status).length != 0 && (
                        <label className="font-bold text-lg text-white">
                            {$lang.latest_downloads}
                        </label>
                    )}

                    <button
                        className="text-blue-500 text-sm md:hover:underline mr-2"
                        onClick={() => {
                            // Lógica para limpiar los downloads
                            console.log("Clear downloads clicked");
                        }}
                    >
                        {$lang.clear_downloads}
                    </button>
                </div>

                {Object.entries(status.songs)
                    .toReversed()
                    .map((songStatus) => (
                        <AddContextMenu key={songStatus[0]} song={songStatus}>
                            <RenderSongDownload
                                songStatus={songStatus}
                                setOpen={setOpen}
                            />
                        </AddContextMenu>
                    ))}
                {Object.entries(status.lists)
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
