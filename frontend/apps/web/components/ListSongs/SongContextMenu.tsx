"use client";

import { BaseSongWithAlbumResponse } from "@/packages/dto";
import { rockIt } from "@/packages/lib/rockit/rockIt";
import useDev from "@/hooks/useDev";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { useSongContextMenu } from "@/components/ListSongs/hooks/useSongContextMenu";
import SongContextMenuOptions from "@/components/ListSongs/SongContextMenuOptions";
import "@/styles/CheckBox.css";
import { type ReactNode } from "react";
import { useStore } from "@nanostores/react";

export default function SongContextMenu({
    children,
    song,
    onPlay,
}: {
    children: ReactNode;
    song: BaseSongWithAlbumResponse;
    onPlay?: () => void;
}) {
    const $currentListSongs = useStore(
        rockIt.currentListManager.currentListSongsAtom
    );
    const dev = useDev();

    const {
        offline,
        isLiked,
        canShare,
        userLists,
        fetchUserLists,
        handleToggleLike,
        handlePlayNext,
        handleAddToQueue,
        handleShare,
        handleCopyUrl,
        handleDownloadToDevice,
        handleGoToArtist,
        handleGoToAlbum,
    } = useSongContextMenu(song);

    const handlePlay = onPlay
        ? onPlay
        : () => songHandleClick(song, [...$currentListSongs]);

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent
                cover={song.imageUrl}
                title={song.name}
                description={`${song.album.name} • ${song.artists.map((a) => a.name).join(", ")}`}
            >
                <SongContextMenuOptions
                    songId={song.publicId}
                    offline={offline}
                    isLiked={isLiked}
                    canShare={canShare}
                    userLists={userLists}
                    dev={dev}
                    onPlay={handlePlay}
                    onToggleLike={handleToggleLike}
                    onPlayNext={handlePlayNext}
                    onAddToQueue={handleAddToQueue}
                    onFetchUserLists={fetchUserLists}
                    onShare={handleShare}
                    onCopyUrl={handleCopyUrl}
                    onDownloadToDevice={handleDownloadToDevice}
                    onGoToArtist={handleGoToArtist}
                    onGoToAlbum={handleGoToAlbum}
                    onDevSendSongEnded={() =>
                        rockIt.audioManager.simulateSongEnded?.()
                    }
                />
            </ContextMenuContent>
        </ContextMenu>
    );
}
