"use client";

import type { SongDB } from "@/lib/db/song";
import { currentList, currentListSongs } from "@/stores/currentList";
import { langData } from "@/stores/lang";
import { likedSongs } from "@/stores/likedList";
import { networkStatus } from "@/stores/networkStatus";
import { useStore } from "@nanostores/react";
import type { ReactNode } from "react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import {
    Copy,
    Download,
    HardDriveDownload,
    Link,
    ListEnd,
    ListStart,
    ListX,
    Pause,
    PlayCircle,
    Share2,
} from "lucide-react";
import {
    currentSong,
    pause,
    play,
    playing,
    queue,
    queueIndex,
    saveSongToIndexedDB,
} from "@/stores/audio";
import { songHandleClick } from "./HandleClick";
import { downloads } from "@/stores/downloads";
import { useRouter } from "next/navigation";

export default function SongPopupMenu({
    children,
    song,
}: {
    children: ReactNode;
    song: SongDB<
        | "id"
        | "name"
        | "artists"
        | "albumName"
        | "albumId"
        | "duration"
        | "image"
        | "path"
    >;
}) {
    const $likedSongs = useStore(likedSongs);
    const $currentListSongs = useStore(currentListSongs);
    const $lang = useStore(langData);
    const $networkStatus = useStore(networkStatus);
    const $playing = useStore(playing);

    const router = useRouter();

    const offline = $networkStatus == "offline";

    const disable = song.path ? false : true;

    if (!$lang) return;

    return (
        <PopupMenu>
            <PopupMenuTrigger>{children}</PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    disable={disable}
                    onClick={() => {
                        if (currentSong.get()?.id == song.id) {
                            if ($playing) {
                                pause();
                            } else {
                                play();
                            }
                        } else {
                            songHandleClick(song, $currentListSongs);
                        }
                    }}
                >
                    {currentSong.get()?.id == song.id && $playing ? (
                        <>
                            <Pause fill="white" className="h-5 w-5" />
                            {$lang.pause_song ?? "Pause song"}
                        </>
                    ) : (
                        <>
                            <PlayCircle className="h-5 w-5" />
                            {$lang.play_song}
                        </>
                    )}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={offline || disable}
                    onClick={() => {
                        if (likedSongs.get().includes(song.id)) {
                            fetch(`/api/like/${song.id}`, {
                                method: "DELETE",
                            }).then((response) => {
                                if (response.ok) {
                                    // Remove song to liked songs store
                                    likedSongs.set(
                                        likedSongs
                                            .get()
                                            .filter(
                                                (likedSong) =>
                                                    likedSong != song.id
                                            )
                                    );
                                } else {
                                    console.log("Error");
                                    // Tell user like request was unsuccessful
                                }
                            });
                        } else {
                            fetch(`/api/like/${song.id}`, {
                                method: "POST",
                            }).then((response) => {
                                if (response.ok) {
                                    // Add song to liked songs store
                                    likedSongs.set([
                                        ...likedSongs.get(),
                                        song.id,
                                    ]);
                                } else {
                                    console.log("Error");
                                    // Tell user like request was unsuccessful
                                }
                            });
                        }
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={"transparent"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={
                            "lucide lucide-hand-metal h-5 w-5 text-white"
                        }
                    >
                        <rect
                            x="6"
                            y="10"
                            width="11"
                            height="7"
                            strokeLinejoin="miter"
                            strokeWidth="0"
                        />
                        <path d="M18 12.5V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.4"></path>
                        <path d="M14 11V9a2 2 0 1 0-4 0v2"></path>
                        <path d="M10 11V5a2 2 2 1 0-4 0v9"></path>
                        <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"></path>
                    </svg>
                    {$likedSongs.includes(song.id)
                        ? $lang.remove_from_liked
                        : $lang.add_to_liked}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={disable}
                    onClick={() => {
                        const tempQueue = queue.get();
                        if (!tempQueue) return;

                        const index = tempQueue.findIndex(
                            (_song) => _song.index == queueIndex.get()
                        );

                        queue.set([
                            ...tempQueue.slice(0, index + 1),
                            {
                                list: currentList.get(),
                                index:
                                    Math.max(
                                        ...tempQueue.map((_song) => _song.index)
                                    ) + 1,
                                song: song,
                            },
                            ...tempQueue.slice(index + 1),
                        ]);
                    }}
                >
                    <ListStart className="h-5 w-5" />
                    {$lang.play_next}
                </PopupMenuOption>

                <PopupMenuOption
                    disable={disable}
                    onClick={() => {
                        const tempQueue = queue.get();
                        if (!tempQueue) return;
                        queue.set([
                            ...tempQueue,
                            {
                                song: song,
                                index:
                                    Math.max(
                                        ...tempQueue.map(
                                            (queueSong) => queueSong.index
                                        )
                                    ) + 1,
                                list: currentList.get(),
                            },
                        ]);
                    }}
                >
                    <ListEnd className="h-5 w-5" />
                    {$lang.add_to_queue}
                </PopupMenuOption>
                {/* <SubContextMenu>
                    <SubContextMenuTrigger disable={offline || disable}>
                        <ListPlusIcon className="w-5 h-5" />
                        {$lang.add_song_to_playlist}
                    </SubContextMenuTrigger>
                    <SubContextMenuContent>
                        {$userLists.map((list) => (
                            <PopupMenuOption
                                key={list.id}
                                onClick={() => {
                                    fetch("/api/playlist/add-song", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            songId: song.id,
                                            playlistId: list.id,
                                        }),
                                    });
                                }}
                            >
                                <img
                                    className="h-6 w-6"
                                    src={getImageUrl({
                                        imageId: list?.image,
                                        placeHolder: "/rockit-background.png",
                                        width: 24,
                                        height: 24,
                                    })}
                                />
                                {list.name}
                            </PopupMenuOption>
                        ))}
                    </SubContextMenuContent>
                </SubContextMenu> */}
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption
                    disable={typeof navigator.share == "undefined" || offline}
                    onClick={() => {
                        navigator.share({
                            title: "RockIt!",
                            text: `${song.name} ${song.albumName} ${song.artists
                                .map((artist) => artist.name)
                                .join(", ")}`,
                            url: `/song/${song.id}`,
                        });
                    }}
                >
                    <Share2 className="h-5 w-5" />
                    {$lang.share_song}
                </PopupMenuOption>
                <PopupMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.id}`
                        );
                    }}
                >
                    <Copy className="h-5 w-5" />
                    {$lang.copy_song_url}
                </PopupMenuOption>
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption
                    className="hover:bg-red-700"
                    disable={disable || true}
                >
                    <ListX className="h-5 w-5" />
                    {$lang.remove_from_queue}
                </PopupMenuOption>
                <PopupMenuOption
                    className="hover:bg-red-700"
                    disable={disable || true}
                >
                    <ListX className="h-5 w-5" />
                    {$lang.remove_from_playlist}
                </PopupMenuOption>
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption disable={disable || true}>
                    <Download className="h-5 w-5" />
                    {$lang.download_mp3}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={offline || disable}
                    onClick={() => {
                        saveSongToIndexedDB(song, true);
                    }}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {$lang.download_song_to_device}
                </PopupMenuOption>
                {disable && (
                    <PopupMenuOption
                        disable={offline}
                        onClick={() => {
                            const url = `https://open.spotify.com/track/${song.id}`;

                            fetch(`/api/start-download?url=${url}`).then(
                                (response) => {
                                    response.json().then((data) => {
                                        downloads.set([
                                            data.download_id,
                                            ...downloads.get(),
                                        ]);
                                    });
                                }
                            );
                        }}
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        Download to server
                    </PopupMenuOption>
                )}
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption
                    onClick={() => {
                        router.push(`/artist/${song.artists[0].id}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_artist}
                </PopupMenuOption>
                <PopupMenuOption
                    onClick={() => {
                        router.push(`/album/${song.albumId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_album}
                </PopupMenuOption>
            </PopupMenuContent>
        </PopupMenu>
    );
}
