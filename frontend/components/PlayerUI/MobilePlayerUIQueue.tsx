"use client";

import { useStore } from "@nanostores/react";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
import { useQueueDrag } from "@/components/PlayerUI/hooks/useQueueDrag";
import useWindowSize from "@/hooks/useWindowSize";
import React, { useEffect, useRef, useState } from "react";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenuOption from "@/components/ContextMenu/Option";
import {
    GripVertical,
    HardDriveDownload,
    ListX,
    PlayCircle,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItSongQueue } from "@/lib/rockit/rockItSongQueue";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MobilePlayerUIQueue({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const { height } = useWindowSize();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [queueScroll, setQueueScroll] = useState(0);

    const { draggingSong, startDrag, calcItemTop } = useQueueDrag();

    // Scroll to current song when queue opens
    useEffect(() => {
        if (!scrollRef.current || !open) return;
        const currentIdx = rockIt.queueManager.queue?.findIndex(
            (s) => s.queueSongId === rockIt.queueManager.currentQueueSongId
        );
        if (currentIdx == null || currentIdx === -1) return;
        scrollRef.current.scrollTo(0, currentIdx * 64 - 100);
    }, [scrollRef, open]);

    const touchStart = (
        e: React.TouchEvent,
        song: RockItSongQueue,
        index: number
    ) => {
        startDrag(e.touches[0].clientY, song, index);
    };

    // TODO: implement when queueManager supports reorder/remove
    const handleRemoveSong = (_song: RockItSongQueue) => {};
    const handlePlaySong = async (_song: RockItSongQueue) => {};

    const { langFile: lang } = useLanguage();
    if (!lang || !$queue || !height) return null;

    return (
        <div
            id="MobilePlayerUIQueue"
            className="absolute top-[80px] z-50 grid h-[calc(100%_-_5rem)] w-full grid-rows-[40px_1fr] rounded-t-lg bg-gray-700 pt-4 pl-2 transition-[top] duration-300 select-none md:select-text"
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full text-center text-xl font-semibold"
                onClick={() => setOpen(false)}
            >
                Queue
            </label>

            <div className="absolute top-12 right-0 bottom-0 left-0">
                <div
                    ref={scrollRef}
                    onScroll={(e) =>
                        setQueueScroll(e.currentTarget.scrollTop)
                    }
                    className={`relative h-full ${!draggingSong ? "overflow-y-auto" : "overflow-y-hidden"}`}
                >
                    <div className="min-h-5" />
                    <div style={{ height: $queue.length * 64 }}>
                        {$queue.map((song, index) => {
                            if (!scrollRef.current) return null;

                            const top = calcItemTop(
                                index,
                                song,
                                scrollRef.current.scrollTop
                            );
                            const isDragging =
                                draggingSong?.song.song.publicId ===
                                song.song.publicId;

                            // Virtual scroll: skip off-screen items
                            const containerHeight =
                                scrollRef.current.offsetHeight;
                            if (
                                top > containerHeight + queueScroll ||
                                top < queueScroll - 74
                            ) {
                                return null;
                            }

                            return (
                                <div
                                    key={`${song.song.publicId}-${song.queueSongId}`}
                                    className={`absolute w-full ${isDragging ? "z-10" : "transition-[top] duration-500"}`}
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
                                                    <QueueSong song={song} />
                                                </div>
                                                <GripVertical
                                                    className="h-full w-full p-1 pr-3"
                                                    onTouchStart={(e) =>
                                                        touchStart(
                                                            e,
                                                            song,
                                                            index
                                                        )
                                                    }
                                                />
                                            </div>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent
                                            cover={
                                                song.song.internalImageUrl ??
                                                rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                            }
                                            title={song.song.name}
                                            description={`${song.song.album.name} • ${song.song.artists.map((a) => a.name).join(", ")}`}
                                        >
                                            <ContextMenuOption
                                                onClick={() =>
                                                    handlePlaySong(song)
                                                }
                                            >
                                                <PlayCircle className="h-5 w-5" />
                                                {lang.play_song}
                                            </ContextMenuOption>
                                            <ContextMenuOption
                                                onClick={() =>
                                                    handleRemoveSong(song)
                                                }
                                            >
                                                <ListX className="h-5 w-5" />
                                                {lang.remove_from_queue}
                                            </ContextMenuOption>
                                            <ContextMenuOption
                                                onClick={() =>
                                                    rockIt.indexedDBManager.saveSongToIndexedDB(
                                                        song.song
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
                    <div className="min-h-10" />
                </div>
                <div className="absolute -top-1 h-10 w-full bg-gradient-to-t from-transparent to-gray-700" />
                <div className="absolute bottom-0 h-10 w-full bg-gradient-to-b from-transparent to-gray-700" />
            </div>
        </div>
    );
}
