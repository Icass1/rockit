"use client";

import {
    Copy,
    Download,
    HardDriveDownload,
    Link,
    ListEnd,
    ListPlusIcon,
    ListStart,
    ListX,
    Pickaxe,
    PlayCircle,
    Share2,
} from "lucide-react";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { likedSongs } from "@/stores/likedList";
import { useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { queue, queueIndex, saveSongToIndexedDB, send } from "@/stores/audio";
import { currentList, currentListSongs } from "@/stores/currentList";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import { songHandleClick } from "./HandleClick";
import { langData } from "@/stores/lang";
import SubContextMenu from "@/components/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ContextMenu/SubContextMenu/Trigger";
import SubContextMenuContent from "@/components/ContextMenu/SubContextMenu/Content";
import { networkStatus } from "@/stores/networkStatus";
import { useRouter } from "next/navigation";
import useDev from "@/hooks/useDev";

import "@/styles/CheckBox.css";
import Image from "next/image";
import { RockItSongType } from "@/types/rockIt";

function ListSubContextMenu({
    list,
    songId,
}: {
    songId: string;
    list: { containSong: boolean; name: string; image: string; id: string };
}) {
    const [checked, setChecked] = useState(list.containSong);
    return (
        <ContextMenuOption closeOnClick={false} onClick={() => {}}>
            <label className="flex cursor-pointer flex-row items-center gap-3 rounded-md transition-colors hover:bg-neutral-700">
                <input
                    checked={checked}
                    onChange={(e) => {
                        if (e.target.checked) {
                            fetch("/api/playlist/add-song", {
                                method: "POST",
                                body: JSON.stringify({
                                    playlistId: list.id,
                                    songId: songId,
                                }),
                            }).then((response) => {
                                if (response.ok) {
                                    setChecked(true);
                                }
                            });
                        } else {
                            fetch("/api/playlist/remove-song", {
                                method: "POST",
                                body: JSON.stringify({
                                    playlistId: list.id,
                                    songId: songId,
                                }),
                            }).then((response) => {
                                if (response.ok) {
                                    setChecked(false);
                                }
                            });
                        }
                    }}
                    type="checkbox"
                    className="rockit-checkbox relative h-5 w-5"
                />
                <Image
                    width={24}
                    height={24}
                    alt={list.name}
                    className="h-6 w-6"
                    src={list?.image}
                />
                {list.name}
            </label>
        </ContextMenuOption>
    );
}

export default function SongContextMenu({
    children,
    song,
    onPlay,
}: {
    children: ReactNode;
    song: RockItSongType;
    onPlay?: () => void;
}) {
    const $likedSongs = useStore(likedSongs);
    const $currentListSongs = useStore(currentListSongs);
    const $lang = useStore(langData);
    const $networkStatus = useStore(networkStatus);

    const offline = $networkStatus == "offline";

    const [userLists, setUserLists] = useState<
        { id: string; name: string; image: string; containSong: boolean }[]
    >([]);

    const router = useRouter();

    const dev = useDev();

    if (!$lang) return false;

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent
                cover={song?.internalImageUrl}
                title={song.name}
                description={
                    song.album.name +
                    " • " +
                    song.artists.map((artist) => artist.name).join(", ")
                }
            >
                <ContextMenuOption
                    onClick={() => {
                        if (onPlay) {
                            onPlay();
                        } else {
                            songHandleClick(song, $currentListSongs);
                        }
                    }}
                >
                    <PlayCircle className="h-5 w-5" />
                    {$lang.play_song}
                </ContextMenuOption>
                <ContextMenuOption
                    disable={offline}
                    onClick={() => {
                        if (likedSongs.get().includes(song.publicId)) {
                            fetch(`/api/like/${song.publicId}`, {
                                method: "DELETE",
                            }).then((response) => {
                                if (response.ok) {
                                    // Remove song to liked songs store
                                    likedSongs.set(
                                        likedSongs
                                            .get()
                                            .filter(
                                                (likedSong) =>
                                                    likedSong != song.publicId
                                            )
                                    );
                                } else {
                                    console.log("Error");
                                    // Tell user like request was unsuccessful
                                }
                            });
                        } else {
                            fetch(`/api/like/${song.publicId}`, {
                                method: "POST",
                            }).then((response) => {
                                if (response.ok) {
                                    // Add song to liked songs store
                                    likedSongs.set([
                                        ...likedSongs.get(),
                                        song.publicId,
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
                    {$likedSongs.includes(song.publicId)
                        ? $lang.remove_from_liked
                        : $lang.add_to_liked}
                </ContextMenuOption>
                <ContextMenuOption
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
                </ContextMenuOption>

                <ContextMenuOption
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
                </ContextMenuOption>
                <SubContextMenu
                    onOpen={() => {
                        if (userLists.length > 0) return;
                        fetch(`/api/song/${song.publicId}/lists`)
                            .then((response) => response.json())
                            .then((data) => {
                                setUserLists(data);
                            });
                    }}
                    onClose={() => {}}
                >
                    <SubContextMenuTrigger disable={offline}>
                        <ListPlusIcon className="h-5 w-5" />
                        {$lang.add_song_to_playlist}
                    </SubContextMenuTrigger>
                    <SubContextMenuContent>
                        {userLists.map((list) => (
                            <ListSubContextMenu
                                songId={song.publicId}
                                list={list}
                                key={list.id}
                            />
                        ))}
                    </SubContextMenuContent>
                </SubContextMenu>
                <ContextMenuSplitter />
                <ContextMenuOption
                    disable={typeof navigator.share == "undefined" || offline}
                    onClick={() => {
                        navigator.share({
                            title: "RockIt!",
                            text: `${song.name} ${song.album.name} ${song.artists
                                .map((artist) => artist.name)
                                .join(", ")}`,
                            url: `/song/${song.publicId}`,
                        });
                    }}
                >
                    <Share2 className="h-5 w-5" />
                    {$lang.share_song}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.publicId}`
                        );
                    }}
                >
                    <Copy className="h-5 w-5" />
                    {$lang.copy_song_url}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption className="hover:bg-red-700" disable>
                    <ListX className="h-5 w-5" />
                    {$lang.remove_from_queue}
                </ContextMenuOption>
                <ContextMenuOption className="hover:bg-red-700" disable>
                    <ListX className="h-5 w-5" />
                    {$lang.remove_from_playlist}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption disable>
                    <Download className="h-5 w-5" />
                    {$lang.download_mp3}
                </ContextMenuOption>
                <ContextMenuOption
                    disable={offline}
                    onClick={() => {
                        saveSongToIndexedDB(song, true);
                    }}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {$lang.download_song_to_device}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() => {
                        router.push(`/artist/${song.artists[0].publicId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_artist}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        router.push(`/album/${song.album.publicId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_album}
                </ContextMenuOption>
                {dev && <ContextMenuSplitter />}
                {dev && (
                    <ContextMenuOption
                        onClick={() => {
                            send({ songEnded: song.publicId });
                        }}
                    >
                        <Pickaxe className="h-5 w-5" />
                        [Dev] Send song ended
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
