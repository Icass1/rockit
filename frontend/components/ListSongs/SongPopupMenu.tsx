"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
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
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";
import useDev from "@/hooks/useDev";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu";

export default function SongPopupMenu({
    children,
    song,
}: {
    children: ReactNode;
    song: BaseSongWithAlbumResponse;
}) {
    const { langFile: lang } = useLanguage();
    const router = useRouter();
    const dev = useDev();

    const $networkStatus = useStore(networkStatus);
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $likedSongs = useStore(rockIt.songManager.likedSongsAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);

    if (!lang) return null;

    const offline = $networkStatus === "offline";

    const isCurrentSong = $currentSong?.publicId === song.publicId;
    const isLiked = $likedSongs.includes(song.publicId);

    const shareSupported =
        typeof navigator !== "undefined" && "share" in navigator;

    const absoluteUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/song/${song.publicId}`
            : "";

    // --- actions -------------------------------------------------------------

    const handlePlay = () => {
        rockIt.audioManager.togglePlayPauseOrSetSong();
    };

    const handleLike = () => {
        rockIt.songManager.toggleLikeSong(song.publicId);
    };

    const handleDownloadDevice = () => {
        rockIt.indexedDBManager.saveSongToIndexedDB(song);
    };

    const handleServerDownload = () => {
        rockIt.downloaderManager.startDownloadAsync(
            `https://open.spotify.com/track/${song.publicId}`
        );
    };

    const handleShare = () => {
        if (!shareSupported) return;

        navigator.share({
            title: "RockIt!",
            text: `${song.name} — ${song.album.name}`,
            url: absoluteUrl,
        });
    };

    const handleCopy = async () => {
        if (typeof navigator === "undefined") return;
        await navigator.clipboard.writeText(absoluteUrl);
    };

    const goToArtist = () => {
        router.push(`/artist/${song.artists[0].publicId}`);
    };

    const goToAlbum = () => {
        router.push(`/album/${song.album.publicId}`);
    };

    // -------------------------------------------------------------------------

    return (
        <PopupMenu>
            <PopupMenuTrigger>{children}</PopupMenuTrigger>

            <PopupMenuContent>
                <PopupMenuOption
                    disabled={!song.downloaded}
                    onClick={handlePlay}
                >
                    {isCurrentSong && $playing ? (
                        <>
                            <Pause className="h-5 w-5" />
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
                    disabled={offline || !song.downloaded}
                    onClick={handleLike}
                >
                    {isLiked ? lang.remove_from_liked : lang.add_to_liked}
                </PopupMenuOption>

                <PopupMenuOption disabled={!song.downloaded}>
                    <ListStart className="h-5 w-5" />
                    {lang.play_next}
                </PopupMenuOption>

                <PopupMenuOption disabled={!song.downloaded}>
                    <ListEnd className="h-5 w-5" />
                    {lang.add_to_queue}
                </PopupMenuOption>

                <PopupMenuOption
                    disabled={!shareSupported || offline}
                    onClick={handleShare}
                >
                    <Share2 className="h-5 w-5" />
                    {lang.share_song}
                </PopupMenuOption>

                <PopupMenuOption onClick={handleCopy}>
                    <Copy className="h-5 w-5" />
                    {lang.copy_song_url}
                </PopupMenuOption>

                <PopupMenuOption disabled>
                    <ListX className="h-5 w-5" />
                    {lang.remove_from_queue}
                </PopupMenuOption>

                <PopupMenuOption disabled>
                    <Download className="h-5 w-5" />
                    {lang.download_mp3}
                </PopupMenuOption>

                <PopupMenuOption
                    disabled={offline || !song.downloaded}
                    onClick={handleDownloadDevice}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {lang.download_song_to_device}
                </PopupMenuOption>

                {!song.downloaded && (
                    <PopupMenuOption
                        disabled={offline}
                        onClick={handleServerDownload}
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        Download to server
                    </PopupMenuOption>
                )}

                <PopupMenuOption onClick={goToArtist}>
                    <Link className="h-5 w-5" />
                    {lang.go_to_artist}
                </PopupMenuOption>

                <PopupMenuOption onClick={goToAlbum}>
                    <Link className="h-5 w-5" />
                    {lang.go_to_album}
                </PopupMenuOption>

                {dev && (
                    <PopupMenuOption
                        onClick={() =>
                            console.log("(SongPopupMenu) Send song ended")
                        }
                    >
                        <Pickaxe className="h-5 w-5" />
                        [Dev] Send song ended
                    </PopupMenuOption>
                )}
            </PopupMenuContent>
        </PopupMenu>
    );
}
