"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { BaseSongWithAlbumResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";
import useDev from "@/hooks/useDev";
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
    const router = useRouter();
    const dev = useDev();

    const $networkStatus = useStore(networkStatus);
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $likedSongs = useStore(rockIt.mediaManager.likedMediaAtom);
    const $currentSong = useStore(rockIt.queueManager.currentMediaAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const offline = $networkStatus === "offline";

    const isCurrentSong = $currentSong?.publicId === song.publicId;
    const isLiked = $likedSongs.includes(song.publicId);

    const shareSupported =
        typeof navigator !== "undefined" && "share" in navigator;

    const absoluteUrl =
        typeof window !== "undefined" ? window.location.href : "";

    // --- actions -------------------------------------------------------------

    const handlePlay = () => {
        rockIt.audioManager.togglePlayPauseOrSetMedia();
    };

    const handleLike = () => {
        rockIt.mediaManager.toggleLikeMedia(song.publicId);
    };

    const handleDownloadDevice = () => {
        rockIt.indexedDBManager.saveMediaToIndexedDB(song);
    };

    const handleServerDownload = () => {
        console.warn("TODO");
        // rockIt.downloaderManager.startDownloadAsync(
        //     `https://open.spotify.com/track/${song.publicId}`
        // );
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
                            {$vocabulary.PAUSE_SONG ?? "Pause song"}
                        </>
                    ) : (
                        <>
                            <PlayCircle className="h-5 w-5" />
                            {$vocabulary.PLAY_SONG}
                        </>
                    )}
                </PopupMenuOption>

                <PopupMenuOption
                    disabled={offline || !song.downloaded}
                    onClick={handleLike}
                >
                    {isLiked
                        ? $vocabulary.REMOVE_FROM_LIKED
                        : $vocabulary.ADD_TO_LIKED}
                </PopupMenuOption>

                <PopupMenuOption disabled={!song.downloaded}>
                    <ListStart className="h-5 w-5" />
                    {$vocabulary.PLAY_NEXT}
                </PopupMenuOption>

                <PopupMenuOption disabled={!song.downloaded}>
                    <ListEnd className="h-5 w-5" />
                    {$vocabulary.ADD_TO_QUEUE}
                </PopupMenuOption>

                <PopupMenuOption
                    disabled={!shareSupported || offline}
                    onClick={handleShare}
                >
                    <Share2 className="h-5 w-5" />
                    {$vocabulary.SHARE_SONG}
                </PopupMenuOption>

                <PopupMenuOption onClick={handleCopy}>
                    <Copy className="h-5 w-5" />
                    {$vocabulary.COPY_SONG_URL}
                </PopupMenuOption>

                <PopupMenuOption disabled>
                    <ListX className="h-5 w-5" />
                    {$vocabulary.REMOVE_FROM_QUEUE}
                </PopupMenuOption>

                <PopupMenuOption disabled>
                    <Download className="h-5 w-5" />
                    {$vocabulary.DOWNLOAD_MP3}
                </PopupMenuOption>

                <PopupMenuOption
                    disabled={offline || !song.downloaded}
                    onClick={handleDownloadDevice}
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {$vocabulary.DOWNLOAD_MEDIA_TO_DEVICE}
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
                    {$vocabulary.GO_TO_ARTIST}
                </PopupMenuOption>

                <PopupMenuOption onClick={goToAlbum}>
                    <Link className="h-5 w-5" />
                    {$vocabulary.GO_TO_ALBUM}
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
