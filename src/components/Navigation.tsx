import type { AlbumDB } from "@/lib/db";
import { downloads } from "@/stores/downloads";
import { pinnedLists } from "@/stores/pinnedLists";
import type { SpotifyAlbum, SpotifyTrack } from "@/types/spotify";
import { useStore } from "@nanostores/react";
import {
    Home,
    Menu,
    Library,
    Search,
    Download,
    Pin,
    ChartLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface EventSourceStatus {
    message: string;
    completed: number;
    song: SpotifyTrack;
}

type statusType = {
    songs: { [key: string]: EventSourceStatus };
    lists: {
        [key: string]: {
            listInfo: SpotifyAlbum;
            totalCompleted: number;
            listError: number;
            songs: { [key: string]: EventSourceStatus };
        };
    };
};

function RenderListDownload({
    list,
}: {
    list: [
        string,
        {
            listInfo: SpotifyAlbum;
            listError: number;
            totalCompleted: number;
            songs: {
                [key: string]: EventSourceStatus;
            };
        }
    ];
}) {
    const [showAllSongs, setShowAllSongs] = useState(false);

    return (
        <div className="bg-zinc-400/10 min-w-0 max-w-full flex flex-col rounded">
            <div className="flex flex-row h-14 min-w-0 max-w-full gap-2">
                <img
                    src={list[1].listInfo.images[0].url}
                    className="h-full w-auto rounded"
                />
                <div className="flex flex-col min-w-0 max-w-full w-full pr-1">
                    <label className="text-base font-semibold">
                        {list[1].listInfo.name}{" "}
                    </label>
                    <label className="text-sm">
                        {list[1].listInfo.artists
                            .map((artist) => artist.name || artist)
                            .join(", ")}
                    </label>
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
                                "bg-green-500 absolute h-full rounded-full transition-all"
                            }
                            style={{ width: `${list[1].totalCompleted}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            <label
                className="hover:underline text-sm text-blue-500 p-1 select-none"
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
                                            className="bg-green-500 absolute h-full rounded-full transition-all"
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
}: {
    songStatus: [string, EventSourceStatus];
}) {
    return (
        <div className="bg-zinc-400/10 rounded h-14 min-h-14 flex flex-row gap-x-2 overflow-hidden">
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
                            className="bg-green-500 absolute h-full rounded-full transition-all"
                            style={{ width: `${songStatus[1].completed}%` }}
                        ></div>
                    </div>
                    <label className="w-auto flex-nowrap text-sm">
                        {" "}
                        {songStatus[1].message}
                    </label>
                </div>
            </div>
        </div>
    );
}

function Downloads({ navOpen }: { navOpen: boolean }) {
    const [open, setOpen] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<statusType>({ songs: {}, lists: {} });

    const $downloads = useStore(downloads);

    const [url, setURL] = useState("");

    const eventSources = useRef<string[]>([]);

    const onMessage = (event: MessageEvent<any>, eventSource: EventSource) => {
        const message = JSON.parse(event.data);
        if (message.list == undefined) {
            setStatus((value: statusType) => {
                let newValue = { ...value };
                if (message.id == undefined) {
                } else {
                    newValue.songs[message.id] = {
                        completed: message.completed,
                        message: message.message,
                        song: message.song,
                    };
                }
                return newValue;
            });
            if (message.completed == 100) {
                eventSource.close();
            }
        } else {
            setStatus((value: statusType) => {
                let newValue = { ...value };
                if (newValue.lists[message.list.id] == undefined) {
                    newValue.lists[message.list.id] = {
                        listInfo: message.list,
                        totalCompleted: message.list_completed,
                        songs: {},
                        listError: message.list_error,
                    };
                } else {
                    newValue.lists[message.list.id].listInfo = message.list;
                    newValue.lists[message.list.id].totalCompleted =
                        message.list_completed;
                    newValue.lists[message.list.id].listError =
                        message.list_error;
                }
                newValue.lists[message.list.id].songs[message.id] = {
                    completed: message.completed,
                    message: message.message,
                    song: message.song,
                };
                return newValue;
            });
            if (
                Math.round(message.list_completed + message.list_error) == 100
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
            console.log("EventSource", `/api/download-status/${downloadId}`);
            console.log(eventSources?.current);
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
                downloads.set([...downloads.get(), data.download_id]);
            });
        });
    };

    return (
        <>
            <div
                ref={divRef}
                className={`w-96 bg-[#252525] h-3/4 flex flex-col gap-2 shadow-lg p-2 rounded-tr-3xl absolute bottom-24 transition-all duration-[400ms] overflow-auto z-50 ${
                    navOpen ? "left-56" : "left-12"
                }`}
                style={{
                    clip: open
                        ? "rect(0px, 24rem, 1000px, 0px)"
                        : `rect(${
                              (window.innerHeight || 10000) * (3 / 4)
                          }px, 24rem, 1000px, 0px)`,
                }}
            >
                <label className="text-3xl font-bold text-center p-5">
                    Music Downloader
                </label>
                <input
                    className="focus:outline-0 p-2 rounded-full mx-5"
                    placeholder="   Enter a spotify URL"
                    value={url}
                    onChange={(e) => {
                        setURL(e.target.value);
                    }}
                ></input>
                <div className="flex justify-center items-center mb-3">
                    <button
                        className="bg-green-800 text-green-200 px-6 py-2 rounded-full shadow-md hover:bg-green-600 hover:text-white hover:shadow-lg transition duration-300 transform"
                        onClick={handleStartDownload}
                    >
                        Start Download
                    </button>
                </div>
                {Object.entries(status).length != 0 && (
                    <label className="font-semibold text-lg text-white ">
                        Lastest Downloads
                    </label>
                )}

                {Object.entries(status.songs).map((songStatus) => (
                    <RenderSongDownload
                        key={songStatus[0]}
                        songStatus={songStatus}
                    />
                ))}
                {Object.entries(status.lists).map((list) => (
                    <RenderListDownload key={list[0]} list={list} />
                ))}
            </div>
            <a
                title="Downloads"
                className="h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 hover:bg-[#414141]"
                onClick={() => {
                    setOpen((value) => !value);
                }}
            >
                <div className="w-8 h-8 flex items-center justify-center relative">
                    <Download className="w-5 h-5" />
                    <label className="absolute text-xs bg-red-500 rounded-full top-0 right-0 aspect-square w-auto h-4 text-center">
                        {downloads.get().length}
                    </label>
                </div>
                <label className="font-semibold">Downloads </label>
            </a>
        </>
    );
}

export default function Navigation({ activePage }: { activePage: string }) {
    const [open, setOpen] = useState(false);

    const $pinnedLists = useStore(pinnedLists);

    const pages = [
        { name: "Home", href: "/", icon: Home },
        { name: "Library", href: "/library", icon: Library },
        { name: "Search", href: "/search", icon: Search },
        { name: "Stats & Friends", href: "/stats", icon: ChartLine },
    ];

    return (
        <div
            className={
                "mx-auto pt-4 pb-4 min-h-0 max-h-full h-full transition-all duration-[400ms] bg-black overflow-hidden " +
                (open ? " w-56 " : " w-12 ")
            }
        >
            <div className="w-56 flex flex-col gap-4 h-full">
                <div
                    className="w-8 h-8 rounded-md items-center justify-center mx-2 transition-all flex"
                    onClick={() => {
                        setOpen((value) => !value);
                    }}
                >
                    <Menu className="w-5 h-5" />
                </div>
                {pages.map((page) => (
                    <a
                        key={page.href}
                        href={page.href}
                        title={page.name}
                        className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                            activePage === page.name
                                ? "bg-white text-black"
                                : "text-white hover:bg-[#414141]"
                        }`}
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <page.icon className="w-5 h-5" />
                        </div>
                        <label className="font-semibold">{page.name}</label>
                    </a>
                ))}

                <div
                    className={`transition-all h-1 bg-neutral-600 ml-2 duration-[400ms] rounded-full ${
                        open ? "w-52" : "w-8"
                    }`}
                ></div>

                <div
                    className="h-4 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 hover:opacity-65 cursor-pointer"
                    style={{ fontSize: open ? "" : "0 px" }}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Pin className="w-5 h-5" />
                    </div>
                    <label className="text-sm">Pinned lists</label>
                </div>

                {$pinnedLists.map((list) => {
                    return (
                        <a
                            key={list.id}
                            href={`/${list.type}/${list.id}`}
                            title={list.name}
                            className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 hover:opacity-65 cursor-pointer`}
                        >
                            <img
                                className="w-8 h-8 flex items-center justify-center rounded-sm"
                                src={list.images[0].url}
                            />
                            <label className="font-semibold text-sm truncate cursor-pointer">
                                {list.name}
                            </label>
                        </a>
                    );
                })}
                <div className="h-full"></div>
                <Downloads navOpen={open} />
            </div>
        </div>
    );
}
