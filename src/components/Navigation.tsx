import useWindowSize from "@/hooks/useWindowSize";
import { downloads } from "@/stores/downloads";
import { pinnedLists } from "@/stores/pinnedLists";
import type {
    SpotifyAlbum,
    SpotifyAlbumImage,
    SpotifyArtist,
} from "@/types/spotify";
import { useStore } from "@nanostores/react";
import {
    Home,
    Menu,
    Library,
    Search,
    Download,
    Pin,
    ChartLine,
    Settings,
} from "lucide-react";
import { useEffect, useRef, useState, type Dispatch } from "react";

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
        }
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
                                    "bg-green-500 absolute h-full rounded-full transition-all"
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
                                    : "bg-green-500")
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

function Downloads({ navOpen }: { navOpen: boolean }) {
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
            console.log("EventSource", `/api/download-status/${downloadId}`);
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
                        className="h-9 object-contain"
                    />
                    <img
                        src="/spotify-logo.png"
                        alt="Spotify Logo"
                        className="h-10 object-contain"
                    />
                </div>

                {/* Label */}
                <label className="text-3xl font-extrabold text-center pt-8">
                    Music Downloader
                </label>

                {/* Input */}
                <input
                    className="focus:outline-0 py-2 px-4 rounded-full mx-5 my-3"
                    placeholder="Enter a Spotify or YT Music URL"
                    value={url}
                    onChange={(e) => {
                        setURL(e.target.value);
                    }}
                ></input>
                <div className="flex justify-center items-center mb-3">
                    <button
                        className="bg-green-800 text-green-200 px-6 py-2 rounded-full shadow-md md:hover:bg-green-600 md:hover:text-white md:hover:shadow-lg transition duration-300 transform font-bold"
                        onClick={handleStartDownload}
                    >
                        Start Download
                    </button>
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

export default function Navigation({ activePage }: { activePage: string }) {
    const [open, setOpen] = useState(false);

    const $pinnedLists = useStore(pinnedLists);

    const pages = [
        { name: "Home", href: "/", icon: Home },
        { name: "Library", href: "/library", icon: Library },
        { name: "Search", href: "/search", icon: Search },
        { name: "Stats & Friends", href: "/stats", icon: ChartLine },
    ];

    const [innerWidth, innerHeight] = useWindowSize();

    if (innerWidth < 768) {
        return (
            <div className="flex justify-center items-center md:py-2 w-full mx-auto min-w-0 max-w-full bg-[#1a1a1a]">
                <div className="flex flex-row justify-center items-center md:pb-0 pb-4 w-full max-w-4xl">
                    {pages.map((page) => (
                        <a
                            key={page.href}
                            href={page.href}
                            title={page.name}
                            className={`h-full w-full flex justify-center items-center md:h-8 rounded-md ml-2 mr-2 transition-all gap-2 ${
                                activePage === page.name
                                    ? "bg-white text-black"
                                    : "text-white md:hover:bg-[#414141]"
                            }`}
                        >
                            <div className="w-8 h-8 flex justify-center items-center">
                                <page.icon className="w-5 h-5" />
                            </div>
                        </a>
                    ))}
                    <a
                        href="/settings"
                        title="Settings"
                        className={`h-full w-full flex justify-center items-center md:h-8 rounded-md ml-2 mr-2 transition-all gap-2 ${
                            activePage === "Settings"
                                ? "bg-white text-black"
                                : "text-white md:hover:bg-[#414141]"
                        }`}
                    >
                        <div className="w-8 h-8 flex justify-center items-center">
                            <Settings className="w-5 h-5" />
                        </div>
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div
            className={
                "mx-auto pt-4 pb-4 min-h-0 max-h-full h-full transition-all duration-[400ms] bg-black overflow-hidden select-none" +
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
                                : "text-white md:hover:bg-[#414141]"
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
                    className="h-4 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 md:hover:opacity-65 cursor-pointer"
                    style={{ fontSize: open ? "" : "0 px" }}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Pin className="w-5 h-5" />
                    </div>
                    <label className="text-md font-semibold">
                        Pinned lists
                    </label>
                </div>

                {$pinnedLists.map((list) => {
                    return (
                        <a
                            key={list.id}
                            href={`/${list.type}/${list.id}`}
                            title={list.name}
                            className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-3 md:hover:opacity-65 cursor-pointer`}
                        >
                            <img
                                className="w-8 h-8 flex items-center justify-center rounded-sm"
                                src={
                                    list?.image
                                        ? `/api/image/${list.image}`
                                        : "/song-placeholder.png"
                                }
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
    //Aqui ignacio revisa lo de la cancion y el placeholder que no va bien (Lineas 526-530)
}
