import { downloads } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState, type Dispatch } from "react";
import {
    Download,
    ArrowDownToLine,
} from "lucide-react";

import type {
    SpotifyAlbum,
    SpotifyAlbumImage,
    SpotifyArtist,
} from "@/types/spotify";

interface EventSourceStatus {
    message: string;
    completed: number;
    song: {
        name: string;
        artists: SpotifyArtist[];
        album: SpotifyAlbum;
        id: string;
    };
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
                    <label className="text-sm">
                        {list[1].listInfo.artists
                            .map((artist) => artist.name || artist)
                            .join(", ")}
                    </label>
                    <div className="flex flex-row items-center gap-2">
                        <div
                            className={
                                "bg-gray-500 h-2 w-full rounded-full relative overflow-hidden"
                            }
                        >
                            <div
                                className="bg-red-400 absolute h-full rounded-full transition-all"
                                style={{
                                    width: `calc(${list[1].listError}% + 20px)`,
                                    left: `calc(${list[1].totalCompleted}% - 20px)`,
                                }}
                            ></div>
                            <div
                                className={
                                    "bg-[#ec5588] absolute h-full rounded-full transition-all"
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
                <div className="flex flex-col gap-2 p-1">
                    {Object.entries(list[1].songs).map((songStatus) => (
                        <div
                            key={songStatus[0]}
                            className="bg-zinc-400/10 rounded h-14 flex flex-row gap-x-2 overflow-hidden"
                        >
                            <div className="flex flex-col w-full p-1 px-2 min-w-0 max-w-full">
                                <label className="truncate min-w-0 max-w-full">
                                    {songStatus[1].song?.name}
                                </label>
                                <div className="w-full grid grid-cols-[1fr_max-content] items-center gap-x-2 ">
                                    <div
                                        className={
                                            "bg-gray-500 h-2 w-full rounded-full relative " +
                                            (songStatus[1].message == "Error" &&
                                                "bg-red-400")
                                        }
                                    >
                                        <div
                                            className="bg-[#ec5588] absolute h-full rounded-full transition-all"
                                            style={{
                                                width: `${songStatus[1].completed}%`,
                                            }}
                                        ></div>
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
                            "bg-gray-500 h-2 w-full rounded-full relative " +
                            (songStatus[1].message == "Error" && "bg-red-400")
                        }
                    >
                        <div
                            className={
                                "absolute h-full rounded-full transition-all " +
                                (songStatus[1].message == "Error"
                                    ? "bg-red-400"
                                    : "bg-[#ec5588]")
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

export default function Downloads({ navOpen }: { navOpen: boolean }) {
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
                eventSource.close();
            }
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
                        className="focus:outline-0 py-2 my-2 px-4 rounded-full mr-3 w-64"
                        placeholder="Enter a Spotify or YT Music URL"
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
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:ring-3 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 peer-checked:bg-green-600"></div>
                            <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></span>
                        </label>
                    </div>*/}
                </div>
                <div className="flex items-center justify-between mb-4">
                    {Object.entries(status).length != 0 && (
                        <label className="font-bold text-lg text-white">
                            Lastest Downloads
                        </label>
                    )}

                    <button
                        className="text-blue-500 text-sm md:hover:underline mr-2"
                        onClick={() => {
                            // Lógica para limpiar los downloads
                            console.log("Clear downloads clicked");
                        }}
                    >
                        Clear downloads
                    </button>
                </div>

                {Object.entries(status.songs)
                    .toReversed()
                    .map((songStatus) => (
                        <RenderSongDownload
                            key={songStatus[0]}
                            songStatus={songStatus}
                            setOpen={setOpen}
                        />
                    ))}
                {Object.entries(status.lists)
                    .toReversed()
                    .map((list) => (
                        <RenderListDownload
                            key={list[0]}
                            list={list}
                            setOpen={setOpen}
                        />
                    ))}
            </div>
            <div
                title="Downloads"
                className="h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 md:hover:bg-[#414141]"
                onClick={() => {
                    setOpen((value) => !value);
                }}
                ref={downloadsButton}
            >
                <div className="w-8 h-8 flex items-center justify-center relative">
                    <Download className="w-5 h-5" />
                    {downloads.get().length > 0 && (
                        <label className="absolute text-xs bg-red-500 rounded-full top-0 right-0 aspect-square w-auto h-4 text-center">
                            {downloads.get().length}
                        </label>
                    )}
                </div>
                <label className="font-semibold">Downloads </label>
            </div>
        </>
    );
}