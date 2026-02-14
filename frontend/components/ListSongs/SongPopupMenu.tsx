"use client";

import { networkStatus } from "@/stores/networkStatus";
import { useStore } from "@nanostores/react";
import { type ReactNode } from "react";
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
    Pickaxe,
    PlayCircle,
    Share2,
} from "lucide-react";

import { useRouter } from "next/navigation";
import useDev from "@/hooks/useDev";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";

export default function SongPopupMenu({
    children,
    song,
}: {
    children: ReactNode;
    song: RockItSongWithAlbum;
}) {
    const $likedSongs = useStore(rockIt.songManager.likedSongsAtom);

    const { langFile: lang } = useLanguage();
    const $networkStatus = useStore(networkStatus);
    const $playing = useStore(rockIt.audioManager.playingAtom);

    const router = useRouter();

    const offline = $networkStatus == "offline";

    const dev = useDev();

    if (!lang) return false;

    return (
        <PopupMenu>
            <PopupMenuTrigger>{children}</PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    disable={!song.downloaded}
                    onClick={() => {
                        rockIt.audioManager.togglePlayPauseOrSetSong();

                        // if (currentSong.get()?.id == song.id) {
                        //     if ($playing) {
                        //         pause();
                        //     } else {
                        //         play();
                        //     }
                        // } else {
                        //     songHandleClick(song, $currentListSongs);
                        // }
                    }}
                >
                    {rockIt.queueManager.currentSongAtom.get()?.publicId ==
                        song.publicId && $playing ? (
                        <>
                            <Pause fill="white" className="h-5 w-5" />
                            {lang.pause_song ?? "Pause song"}
                        </>
                    ) : (
                        <>
                            <PlayCircle className="h-5 w-5" />
                            {lang.play_song}
                        </>
                    )}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={offline || !song.downloaded}
                    onClick={() =>
                        rockIt.songManager.toggleLikeSong(song.publicId)
                    }
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
                        ? lang.remove_from_liked
                        : lang.add_to_liked}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={!song.downloaded}
                    onClick={() => {
                        console.log("SongPopupMenu playNext");
                    }}
                >
                    <ListStart className="h-5 w-5" />
                    {lang.play_next}
                </PopupMenuOption>

                <PopupMenuOption
                    disable={!song.downloaded}
                    onClick={() => {
                        console.log("SongPopupMenu add song to queue");
                    }}
                >
                    <ListEnd className="h-5 w-5" />
                    {lang.add_to_queue}
                </PopupMenuOption>
                {/* <SubContextMenu>
                    <SubContextMenuTrigger !song.downloaded={offline || !song.downloaded}>
                        <ListPlusIcon className="w-5 h-5" />
                        {lang.add_song_to_playlist}
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
                                        placeHolder: "/api/image/rockit-background.png",
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
                            text: `${song.name} ${song.album.name} ${song.artists
                                .map((artist) => artist.name)
                                .join(", ")}`,
                            url: `/song/${song.publicId}`,
                        });
                    }}
                >
                    <Share2 className="h-5 w-5" />
                    {lang.share_song}
                </PopupMenuOption>
                <PopupMenuOption
                    onClick={() => {
                        navigator.clipboard.writeText(
                            location.origin + `/song/${song.publicId}`
                        );
                    }}
                >
                    <Copy className="h-5 w-5" />
                    {lang.copy_song_url}
                </PopupMenuOption>
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption
                    className="hover:bg-red-700"
                    disable={!song.downloaded || true}
                >
                    <ListX className="h-5 w-5" />
                    {lang.remove_from_queue}
                </PopupMenuOption>
                <PopupMenuOption
                    className="hover:bg-red-700"
                    disable={!song.downloaded || true}
                >
                    <ListX className="h-5 w-5" />
                    {lang.remove_from_playlist}
                </PopupMenuOption>
                {/* <ContextMenuSplitter /> */}
                <PopupMenuOption disable={!song.downloaded || true}>
                    <Download className="h-5 w-5" />
                    {lang.download_mp3}
                </PopupMenuOption>
                <PopupMenuOption
                    disable={offline || !song.downloaded}
                    onClick={() => {
                        rockIt.indexedDBManager.saveSongToIndexedDB(song);
                    }}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {lang.download_song_to_device}
                </PopupMenuOption>
                {!song.downloaded && (
                    <PopupMenuOption
                        disable={offline}
                        onClick={() => {
                            rockIt.downloaderManager.startDownloadAsync(
                                `https://open.spotify.com/track/${song.publicId}`
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
                        router.push(`/artist/${song.artists[0].publicId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {lang.go_to_artist}
                </PopupMenuOption>
                <PopupMenuOption
                    onClick={() => {
                        router.push(`/album/${song.album.publicId}`);
                    }}
                >
                    <Link className="h-5 w-5" />
                    {lang.go_to_album}
                </PopupMenuOption>
                {dev && (
                    <PopupMenuOption
                        onClick={() => {
                            console.log("(SongPopupMenu) Send song ended");
                        }}
                    >
                        <Pickaxe className="h-5 w-5" />
                        [Dev] Send song ended
                    </PopupMenuOption>
                )}
            </PopupMenuContent>
        </PopupMenu>
    );
}
