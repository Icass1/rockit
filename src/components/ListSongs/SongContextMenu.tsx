import {
    Copy,
    Download,
    HardDriveDownload,
    Link,
    ListEnd,
    ListPlusIcon,
    ListStart,
    ListX,
    PlayCircle,
    Share2,
} from "lucide-react";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuOption from "../ContextMenu/Option";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import { likedSongs } from "@/stores/likedList";
import type { SongDB } from "@/db/song";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { queue, queueIndex, saveSongToIndexedDB } from "@/stores/audio";
import { currentList, currentListSongs } from "@/stores/currentList";
import ContextMenuSplitter from "../ContextMenu/Splitter";
import { navigate } from "astro:transitions/client";
import { songHandleClick } from "./HandleClick";
import { langData } from "@/stores/lang";
import { getImageUrl } from "@/lib/getImageUrl";
import type { UserDB } from "@/lib/db/user";
import SubContextMenu from "../ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "../ContextMenu/SubContextMenu/Trigger";
import SubContextMenuContent from "../ContextMenu/SubContextMenu/Content";
import { networkStatus } from "@/stores/networkStatus";

export default function SongContextMenu({
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

    const offline = $networkStatus == "offline";

    const [userLists, setUserLists] = useState<
        { id: string; name: string; image: string }[]
    >([]);

    useEffect(() => {
        if (!navigator.onLine) return;

        fetch("/api/user?q=lists")
            .then((response) => response.json())
            .then((data: UserDB<"lists">) =>
                fetch(
                    `/api/playlists?playlists=${data.lists
                        .filter((list) => list.type == "playlist")
                        .map((list) => list.id)
                        .join()}&p=id,name,image`
                )
            )
            .then((response) => response.json())
            .then((data: { id: string; name: string; image: string }[]) => {
                setUserLists(data);
            });
    }, []);

    if (!$lang) return;

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent
                cover={getImageUrl({ imageId: song.image })}
                title={song.name}
                description={
                    song.albumName +
                    " • " +
                    song.artists.map((artist) => artist.name).join(", ")
                }
            >
                <ContextMenuOption
                    onClick={() => songHandleClick(song, $currentListSongs)}
                >
                    <PlayCircle className="h-5 w-5" />
                    {$lang.play_song}
                </ContextMenuOption>
                <ContextMenuOption
                    disable={offline}
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
                            "lucide lucide-hand-metal text-white h-5 w-5"
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
                <SubContextMenu>
                    <SubContextMenuTrigger disable={offline}>
                        <ListPlusIcon className="w-5 h-5" />
                        {$lang.add_song_to_playlist}
                    </SubContextMenuTrigger>
                    <SubContextMenuContent>
                        {userLists.map((list) => (
                            <ContextMenuOption
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
                                        imageId: list.image,
                                        placeHolder: "/rockit-background.png",
                                        width: 24,
                                        height: 24,
                                    })}
                                />
                                {list.name}
                            </ContextMenuOption>
                        ))}
                    </SubContextMenuContent>
                </SubContextMenu>
                <ContextMenuSplitter />
                <ContextMenuOption
                    disable={typeof navigator.share == "undefined" || offline}
                    onClick={() => {
                        navigator.share({
                            title: "RockIt!",
                            text: `${song.name} ${song.albumName} ${song.artists.map((artist) => artist.name).join(", ")}`,
                            url: `/song/${song.id}`,
                        });
                    }}
                >
                    <Share2 className="h-5 w-5" />
                    {$lang.share_song}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.id}`
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
                        navigate(`/artist/${song.artists[0].id}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_artist}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigate(`/album/${song.albumId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {$lang.go_to_album}
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
