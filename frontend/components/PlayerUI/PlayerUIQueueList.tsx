"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import { RockItAlbumWithoutSongs } from "@/lib/rockit/rockItAlbumWithoutSongs";
import { RockItSongQueue } from "@/lib/rockit/rockItSongQueue";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { useQueueDrag } from "@/components/PlayerUI/hooks/Usequeuedrag";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
import { Lang } from "@/types/lang";
import { useStore } from "@nanostores/react";
import {
    GripVertical,
    HardDriveDownload,
    ListPlus,
    ListX,
    PlayCircle,
} from "lucide-react";

// Placeholder songs shown below the real queue (mockup until autoplay is implemented)
const AUTO_PLAY_MOCKS = [
    { id: "auto1", title: "Neon Nights", artist: "Synthwave Dreams" },
    { id: "auto2", title: "Midnight Ride", artist: "Retro Driver" },
    { id: "auto3", title: "Digital Sunset", artist: "Pixel Horizons" },
    { id: "auto4", title: "Electric Pulse", artist: "Voltage" },
    { id: "auto5", title: "Echoes in the Dark", artist: "Shadow Sound" },
];

function buildAutoSong(mock: (typeof AUTO_PLAY_MOCKS)[number], idx: number) {
    return new RockItSongQueue({
        song: new RockItSongWithAlbum({
            publicId: mock.id,
            name: mock.title,
            artists: [],
            discNumber: 1,
            duration: 123,
            downloaded: true,
            album: new RockItAlbumWithoutSongs({
                externalImages: [],
                name: "Album 1",
                publicId: "",
                artists: [],
                releaseDate: "",
                internalImageUrl: "",
            }),
            internalImageUrl: null,
            audioUrl: null,
        }),
        queueSongId: idx,
        list: { type: "auto-list", publicId: "auto-list" },
    });
}

interface PlayerUIQueueListProps {
    queue: RockItSongQueue[];
    queueScroll: number;
    lang: Lang;
}

export function PlayerUIQueueList({
    queue,
    queueScroll,
    lang,
}: PlayerUIQueueListProps) {
    const $currentQueueSongId = useStore(
        rockIt.queueManager.currentQueueSongIdAtom
    );
    const { draggingSong, startDrag, calcItemTop } = useQueueDrag();

    // TODO: implement when queueManager.reorderQueue is available
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleRemoveSong = (_song: RockItSongQueue) => {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlaySong = async (_song: RockItSongQueue) => {};

    return (
        <>
            <div style={{ height: queue.length * 64 }} />

            {queue.map((queueSong, index) => {
                const top = calcItemTop(index, queueSong, queueScroll);
                const isDragging =
                    draggingSong?.song.song.publicId ===
                    queueSong.song.publicId;

                if (top > queueScroll + 500 || top < queueScroll - 500) {
                    return null;
                }

                return (
                    <div
                        key={`${queueSong.song.publicId}-${queueSong.queueSongId}`}
                        className={`absolute w-full ${isDragging ? "z-10" : "transition-[top] duration-200"}`}
                        style={{
                            top: `${top + 20}px`,
                            transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    >
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <div className="grid grid-cols-[1fr_45px] items-center">
                                    <div className="w-full max-w-full min-w-0">
                                        <QueueSong song={queueSong} />
                                    </div>
                                    <GripVertical
                                        className="h-full w-full p-1 pr-3"
                                        onMouseDown={(e) =>
                                            startDrag(
                                                e.clientY,
                                                queueSong,
                                                index
                                            )
                                        }
                                    />
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent
                                cover={
                                    queueSong.song.internalImageUrl ??
                                    rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                }
                                title={queueSong.song.name}
                                description={`${queueSong.song.album.name} • ${queueSong.song.artists.map((a) => a.name).join(", ")}`}
                            >
                                <ContextMenuOption
                                    onClick={() => handlePlaySong(queueSong)}
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    {lang.play_song}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() => handleRemoveSong(queueSong)}
                                    disable={
                                        $currentQueueSongId ===
                                        queueSong.queueSongId
                                    }
                                >
                                    <ListX className="h-5 w-5" />
                                    {lang.remove_from_queue}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() =>
                                        rockIt.indexedDBManager.saveSongToIndexedDB(
                                            queueSong.song
                                        )
                                    }
                                >
                                    <HardDriveDownload className="h-5 w-5" />
                                    {lang.download_song_to_device}
                                </ContextMenuOption>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                );
            })}

            {/* Auto-play section */}
            <div>
                <div className="mt-5 h-px w-full bg-neutral-400" />
                <h2 className="text-md my-2 px-4 font-semibold text-neutral-400">
                    Reproducciones automáticas a continuación
                </h2>
                {AUTO_PLAY_MOCKS.map((mock, i) => {
                    const autoSong = buildAutoSong(mock, i);

                    return (
                        <div
                            key={`auto-${mock.id}`}
                            className="relative w-full transition-[top] duration-200"
                            style={{
                                transitionTimingFunction:
                                    "cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                        >
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div className="grid grid-cols-[1fr_45px] items-center">
                                        <div className="w-full max-w-full min-w-0">
                                            <QueueSong song={autoSong} />
                                        </div>
                                        <ListPlus className="h-full w-full p-1 pr-4" />
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent
                                    cover={
                                        autoSong.song.internalImageUrl ??
                                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                    }
                                    title={autoSong.song.name}
                                    description={`${autoSong.song.album.name} • ${autoSong.song.artists.map((a) => a.name).join(", ")}`}
                                >
                                    <ContextMenuOption
                                        onClick={() => handlePlaySong(autoSong)}
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                        {lang.play_song}
                                    </ContextMenuOption>
                                    <ContextMenuOption
                                        onClick={() =>
                                            handleRemoveSong(autoSong)
                                        }
                                        disable={
                                            $currentQueueSongId ===
                                            autoSong.queueSongId
                                        }
                                    >
                                        <ListX className="h-5 w-5" />
                                        {lang.remove_from_queue}
                                    </ContextMenuOption>
                                    <ContextMenuOption
                                        onClick={() =>
                                            rockIt.indexedDBManager.saveSongToIndexedDB(
                                                autoSong.song
                                            )
                                        }
                                    >
                                        <HardDriveDownload className="h-5 w-5" />
                                        {lang.download_song_to_device}
                                    </ContextMenuOption>
                                </ContextMenuContent>
                            </ContextMenu>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
