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
import type { ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { queue, saveSongToIndexedDB } from "@/stores/audio";
import { currentList } from "@/stores/currentList";
import ContextMenuSplitter from "../ContextMenu/Splitter";
import { navigate } from "astro:transitions/client";
import { songHandleClick } from "./HandleClick";
import { langData } from "@/stores/lang";

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

    const lang = langData.get();

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption onClick={() => songHandleClick(song)}>
                    <PlayCircle className="h-5 w-5" />
                    {lang.play_song}
                </ContextMenuOption>
                <ContextMenuOption className="pointer-events-none opacity-50">
                    <ListStart className="h-5 w-5" />
                    {lang.play_next}
                </ContextMenuOption>
                <ContextMenuOption className="pointer-events-none opacity-50">
                    <ListPlusIcon className="w-5 h-5" />
                    {lang.add_song_to_playlist}
                </ContextMenuOption>

                <ContextMenuOption
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
                        ? lang.remove_from_liked
                        : lang.add_to_liked}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        queue.set([
                            ...queue.get(),
                            {
                                song: song,
                                index:
                                    Math.max(
                                        ...queue
                                            .get()
                                            .map((queueSong) => queueSong.index)
                                    ) + 1,
                                list: currentList.get(),
                            },
                        ]);
                    }}
                >
                    <ListEnd className="h-5 w-5" />
                    {lang.add_to_queue}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption className="pointer-events-none opacity-50">
                    <Share2 className="h-5 w-5" />
                    {lang.share_song}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.id}`
                        );
                    }}
                >
                    <Copy className="h-5 w-5" />
                    {lang.copy_song_url}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption className="hover:bg-red-700 pointer-events-none opacity-50">
                    <ListX className="h-5 w-5" />
                    {lang.remove_from_queue}
                </ContextMenuOption>
                <ContextMenuOption className="hover:bg-red-700 pointer-events-none opacity-50">
                    <ListX className="h-5 w-5" />
                    {lang.remove_from_playlist}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption className="pointer-events-none opacity-50">
                    <Download className="h-5 w-5" />
                    {lang.download_mp3}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        saveSongToIndexedDB(song);
                    }}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {lang.download_song_to_device}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() => {
                        navigate(`/artist/${song.artists[0].id}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {lang.go_to_artist}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() => {
                        navigate(`/album/${song.albumId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {lang.go_to_album}
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
