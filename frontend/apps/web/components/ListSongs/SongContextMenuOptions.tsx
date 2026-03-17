"use client";

import { useStore } from "@nanostores/react";
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
import { rockIt } from "@/packages/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import SubContextMenuContent from "@/components/ContextMenu/SubContextMenu/Content";
import SubContextMenu from "@/components/ContextMenu/SubContextMenu/ContextMenu";
import SubContextMenuTrigger from "@/components/ContextMenu/SubContextMenu/Trigger";
import type { UserList } from "@/components/ListSongs/hooks/useSongContextMenu";
import ListSubContextMenu from "@/components/ListSongs/ListSubContextMenu";

function HandMetalIcon({ className }: { className: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect
                x="6"
                y="10"
                width="11"
                height="7"
                strokeLinejoin="miter"
                strokeWidth="0"
            />
            <path d="M18 12.5V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.4" />
            <path d="M14 11V9a2 2 1 0-4 0v2" />
            <path d="M10 11V5a2 2 1 0-4 0v9" />
            <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 1 0-4 0v5" />
        </svg>
    );
}

interface SongContextMenuOptionsProps {
    songId: string;
    offline: boolean;
    isLiked: boolean;
    canShare: boolean;
    userLists: UserList[];
    dev: boolean;
    onPlay: () => void;
    onToggleLike: () => void;
    onPlayNext: () => void;
    onAddToQueue: () => void;
    onFetchUserLists: () => void;
    onShare: () => void;
    onCopyUrl: () => void;
    onDownloadToDevice: () => void;
    onGoToArtist: () => void;
    onGoToAlbum: () => void;
    onDevSendSongEnded: () => void;
}

export default function SongContextMenuOptions({
    songId,
    offline,
    isLiked,
    canShare,
    userLists,
    dev,
    onPlay,
    onToggleLike,
    onPlayNext,
    onAddToQueue,
    onFetchUserLists,
    onShare,
    onCopyUrl,
    onDownloadToDevice,
    onGoToArtist,
    onGoToAlbum,
    onDevSendSongEnded,
}: SongContextMenuOptionsProps) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <>
            <ContextMenuOption onClick={onPlay}>
                <PlayCircle className="h-5 w-5" />
                {$vocabulary.PLAY_SONG}
            </ContextMenuOption>

            <ContextMenuOption disable={offline} onClick={onToggleLike}>
                <HandMetalIcon className="h-5 w-5 text-white" />
                {isLiked
                    ? $vocabulary.REMOVE_FROM_LIKED
                    : $vocabulary.ADD_TO_LIKED}
            </ContextMenuOption>

            <ContextMenuOption onClick={onPlayNext}>
                <ListStart className="h-5 w-5" />
                {$vocabulary.PLAY_NEXT}
            </ContextMenuOption>

            <ContextMenuOption onClick={onAddToQueue}>
                <ListEnd className="h-5 w-5" />
                {$vocabulary.ADD_TO_QUEUE}
            </ContextMenuOption>

            <SubContextMenu onOpen={onFetchUserLists} onClose={() => {}}>
                <SubContextMenuTrigger disable={offline}>
                    <ListPlusIcon className="h-5 w-5" />
                    {$vocabulary.ADD_SONG_TO_PLAYLIST}
                </SubContextMenuTrigger>
                <SubContextMenuContent>
                    {userLists.map((list) => (
                        <ListSubContextMenu
                            key={list.id}
                            songId={songId}
                            list={list}
                        />
                    ))}
                </SubContextMenuContent>
            </SubContextMenu>

            <ContextMenuSplitter />

            <ContextMenuOption disable={!canShare} onClick={onShare}>
                <Share2 className="h-5 w-5" />
                {$vocabulary.SHARE_SONG}
            </ContextMenuOption>

            <ContextMenuOption onClick={onCopyUrl}>
                <Copy className="h-5 w-5" />
                {$vocabulary.COPY_SONG_URL}
            </ContextMenuOption>

            <ContextMenuSplitter />

            <ContextMenuOption className="hover:bg-red-700" disable>
                <ListX className="h-5 w-5" />
                {$vocabulary.REMOVE_FROM_QUEUE}
            </ContextMenuOption>

            <ContextMenuOption className="hover:bg-red-700" disable>
                <ListX className="h-5 w-5" />
                {$vocabulary.REMOVE_FROM_PLAYLIST}
            </ContextMenuOption>

            <ContextMenuSplitter />

            <ContextMenuOption disable>
                <Download className="h-5 w-5" />
                {$vocabulary.DOWNLOAD_MP3}
            </ContextMenuOption>

            <ContextMenuOption disable={offline} onClick={onDownloadToDevice}>
                <HardDriveDownload className="h-5 w-5" />
                {$vocabulary.DOWNLOAD_SONG_TO_DEVICE}
            </ContextMenuOption>

            <ContextMenuSplitter />

            <ContextMenuOption onClick={onGoToArtist}>
                <Link className="h-5 w-5" />
                {$vocabulary.GO_TO_ARTIST}
            </ContextMenuOption>

            <ContextMenuOption onClick={onGoToAlbum}>
                <Link className="h-5 w-5" />
                {$vocabulary.GO_TO_ALBUM}
            </ContextMenuOption>

            {dev && <ContextMenuSplitter />}
            {dev && (
                <ContextMenuOption onClick={onDevSendSongEnded}>
                    <Pickaxe className="h-5 w-5" />
                    [Dev] Send song ended
                </ContextMenuOption>
            )}
        </>
    );
}
