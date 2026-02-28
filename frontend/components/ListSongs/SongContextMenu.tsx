"use client";

import { type ReactNode } from "react";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import useDev from "@/hooks/useDev";
import { useLanguage } from "@/contexts/LanguageContext";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { useSongContextMenu } from "@/components/ListSongs/hooks/useSongContextMenu";
import SongContextMenuOptions from "@/components/ListSongs/SongContextMenuOptions";
import "@/styles/CheckBox.css";

export default function SongContextMenu({
    children,
    song,
    onPlay,
}: {
    children: ReactNode;
    song: BaseSongWithAlbumResponse;
    onPlay?: () => void;
}) {
    const { langFile: lang } = useLanguage();
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

    if (!lang) return null;

    const handlePlay = onPlay
        ? onPlay
        : () => songHandleClick(song, [...$currentListSongs]);

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent
                cover={song.internalImageUrl ?? "/song-placeholder.png"}
                title={song.name}
                description={`${song.album.name} • ${song.artists.map((a) => a.name).join(", ")}`}
            >
                <SongContextMenuOptions
                    songId={song.publicId}
                    lang={lang}
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
