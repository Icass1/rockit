"use client";

import { useStore } from "@nanostores/react";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
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
    const [draggingSong, setDraggingSong] = useState<
        | {
              song: RockItSongQueue;
              index: number;
          }
        | undefined
    >();
    const [draggingPosY, setDraggingPosY] = useState(0);
    const draggingPosYRef = useRef(0);
    const scrollContainerTopRef = useRef(0);

    useEffect(() => {
        if (!scrollRef.current || !open) return;

        const currentSongIndexInQueue = rockIt.queueManager.queue?.findIndex(
            (song) => song.index == rockIt.queueManager.queueIndex
        );

        if (
            currentSongIndexInQueue === -1 ||
            typeof currentSongIndexInQueue == "undefined"
        )
            return;

        scrollRef.current.scrollTo(0, currentSongIndexInQueue * 64 - 100);
    }, [scrollRef, open]);

    const handleRemoveSong = (song: RockItSongQueue) => {
        console.warn("handleRemoveSong", song);
        // if (song.index == rockIt.queueManager.queueIndex) {
        //     // Alert the user that the song is currently playing cannot be removed.
        //     return;
        // }
        // const tempQueue = rockIt.queueManager.queue;
        // if (!tempQueue) return;
        // const index = tempQueue.findIndex((_song) => _song.index == song.index);
        // if (index === -1 || typeof index == "undefined") return;
        // queue.set([
        //     ...tempQueue.slice(0, index),
        //     ...tempQueue.slice(index + 1),
        // ]);
    };

    const handlePlaySong = async (song: RockItSongQueue) => {
        console.warn("handlePlaySong", song);
        // const tempQueue = queue.get();
        // if (!tempQueue) return;
        // const currentSongIndexInQueue = tempQueue.findIndex(
        //     (_song) => _song.index == song.index
        // );
        // queueIndex.set(tempQueue[currentSongIndexInQueue].index);
        // const newSongId = tempQueue.find(
        //     (song) => song.index == queueIndex.get()
        // )?.song.id;
        // if (!newSongId) return;
        // await fetch(`/api/song/${newSongId}`)
        //     .then((response) => response.json())
        //     .then((data: SongDB) => {
        //         playWhenReady.set(true);
        //         currentSong.set(data);
        //     });
    };

    const touchStart = (
        event: React.TouchEvent,
        song: RockItSongQueue,
        index: number
    ) => {
        const scrollContainerTop =
            scrollRef.current?.getBoundingClientRect().top || 0;
        scrollContainerTopRef.current = scrollContainerTop;

        setDraggingSong({ song, index });
        setDraggingPosY(event.touches[0].clientY);
        draggingPosYRef.current = event.touches[0].clientY;
    };

    useEffect(() => {
        if (!draggingSong) return;
        const handleTouchMove = (event: TouchEvent) => {
            setDraggingPosY(Math.round(event.touches[0].clientY * 100) / 100);
            draggingPosYRef.current =
                Math.round(event.touches[0].clientY * 100) / 100;
        };

        const handleTouchEnd = () => {
            // setDraggingSong(undefined);
            // const tempQueue = queue.get();
            // if (!tempQueue) return;
            // if (typeof scrollRef.current?.scrollTop != "number") return;
            // const indexInQueue = Math.floor(
            //     (draggingPosYRef.current -
            //         185 +
            //         32 +
            //         scrollRef.current?.scrollTop) /
            //         64
            // );
            // if (draggingSong.index == indexInQueue) return;
            // else if (draggingSong.index < indexInQueue) {
            //     queue.set([
            //         ...tempQueue.slice(0, draggingSong.index),
            //         ...tempQueue.slice(
            //             draggingSong.index + 1,
            //             indexInQueue + 1
            //         ),
            //         draggingSong.song,
            //         ...tempQueue.slice(indexInQueue + 1),
            //     ]);
            // } else {
            //     queue.set([
            //         ...tempQueue.slice(0, indexInQueue),
            //         draggingSong.song,
            //         ...tempQueue.slice(indexInQueue, draggingSong.index),
            //         ...tempQueue.slice(draggingSong.index + 1),
            //     ]);
            // }
        };

        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("touchend", handleTouchEnd);
        return () => {
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [draggingSong]);

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
                    onScroll={(e) => setQueueScroll(e.currentTarget.scrollTop)}
                    className={`relative h-full ${!draggingSong ? "overflow-y-auto" : "overflow-y-hidden"}`}
                >
                    <div className="min-h-5" />
                    <div style={{ height: $queue.length * 64 }}>
                        {$queue.map((song, index) => {
                            if (!scrollRef.current) return;

                            let top: number;

                            let draggingTop: number | undefined;
                            const isDragging =
                                draggingSong?.song.song.publicId ===
                                song.song.publicId;

                            if (draggingSong)
                                draggingTop = Math.max(
                                    draggingPosY -
                                        185 +
                                        scrollRef.current.scrollTop,
                                    0
                                );

                            if (
                                draggingSong?.song.song.publicId ==
                                    song.song.publicId &&
                                typeof draggingTop == "number"
                            ) {
                                top = draggingTop;
                            } else {
                                top = index * 64;
                            }

                            if (
                                typeof draggingTop == "number" &&
                                typeof draggingSong?.index == "number" &&
                                draggingSong?.index != index &&
                                draggingTop - 32 < top &&
                                draggingSong?.index * 64 > top
                            ) {
                                top += 64;
                            }

                            if (
                                typeof draggingTop == "number" &&
                                typeof draggingSong?.index == "number" &&
                                draggingSong?.index != index &&
                                draggingTop + 32 > top &&
                                draggingSong?.index * 64 < top
                            ) {
                                top -= 64;
                            }

                            if (
                                (scrollRef.current?.offsetHeight &&
                                    top >
                                        scrollRef.current?.offsetHeight +
                                            queueScroll) ||
                                top < queueScroll - 74
                            ) {
                                return;
                            }

                            return (
                                <div
                                    key={`${song.song.publicId}-${song.index}`}
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
                                                    <QueueSong
                                                        key={song.index}
                                                        song={song}
                                                    />
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
                                            description={`${song.song.album.name} • ${song.song.artists
                                                .map((a) => a.name)
                                                .join(", ")}`}
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
