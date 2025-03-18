import {
    currentSong,
    playWhenReady,
    queue,
    queueIndex,
    saveSongToIndexedDB,
    type QueueElement,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
import useWindowSize from "@/hooks/useWindowSize";
import React, { useEffect, useRef, useState } from "react";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenuOption from "../ContextMenu/Option";
import { getImageUrl } from "@/lib/getImageUrl";
import {
    GripVertical,
    HardDriveDownload,
    ListX,
    PlayCircle,
} from "lucide-react";
import { langData } from "@/stores/lang";
import type { SongDB } from "@/lib/db/song";

export default function MobilePlayerUIQueue({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const $queue = useStore(queue);
    const { height } = useWindowSize();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [queueScroll, setQueueScroll] = useState(0);
    const [draggingSong, setDraggingSong] = useState<
        | {
              song: QueueElement;
              index: number;
          }
        | undefined
    >();
    const [draggingPosY, setDraggingPosY] = useState(0);
    const draggingPosYRef = useRef(0);

    useEffect(() => {
        if (!scrollRef.current) return;
        if (!open) return;

        const currentSongIndexInQueue = queue
            .get()
            ?.findIndex((song) => song.index == queueIndex.get());

        if (!currentSongIndexInQueue) return;

        scrollRef.current.scrollTo(0, currentSongIndexInQueue * 64 - 100);
    }, [scrollRef, open]);

    const handleRemoveSong = (song: QueueElement) => {
        if (song.index == queueIndex.get()) {
            // Alert the user that the song is currently playing cannot be removed.
            return;
        }

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const index = tempQueue.findIndex((_song) => _song.index == song.index);

        if (!index) return;

        queue.set([
            ...tempQueue?.slice(0, index),
            ...tempQueue?.slice(index + 1),
        ]);
    };
    const handlePlaySong = async (song: QueueElement) => {
        const tempQueue = queue.get();
        if (!tempQueue) return;

        const currentSongIndexInQueue = tempQueue.findIndex(
            (_song) => _song.index == song.index
        );

        queueIndex.set(tempQueue[currentSongIndexInQueue].index);

        const newSongId = tempQueue.find(
            (song) => song.index == queueIndex.get()
        )?.song.id;
        if (!newSongId) {
            return;
        }

        await fetch(`/api/song/${newSongId}`)
            .then((response) => response.json())
            .then((data: SongDB) => {
                playWhenReady.set(true);
                currentSong.set(data);
            });
    };

    const touchStart = (
        event: React.TouchEvent,
        song: QueueElement,
        index: number
    ) => {
        setDraggingSong({
            song: song,
            index: index,
        });
        setDraggingPosY(event.touches[0].clientY);
        draggingPosYRef.current =
            Math.round(event.touches[0].clientY * 100) / 100;
    };

    useEffect(() => {
        if (!draggingSong) return;
        const handleTouchMove = (event: TouchEvent) => {
            setDraggingPosY(Math.round(event.touches[0].clientY * 100) / 100);
            draggingPosYRef.current =
                Math.round(event.touches[0].clientY * 100) / 100;
        };

        const handleTouchEnd = () => {
            setDraggingSong(undefined);

            const tempQueue = queue.get();
            if (!tempQueue) return;

            if (typeof scrollRef.current?.scrollTop != "number") return;
            const indexInQueue = Math.floor(
                (draggingPosYRef.current -
                    185 +
                    32 +
                    scrollRef.current?.scrollTop) /
                    64
            );

            if (draggingSong.index == indexInQueue) return;
            else if (draggingSong.index < indexInQueue) {
                queue.set([
                    ...tempQueue.slice(0, draggingSong.index),
                    ...tempQueue.slice(
                        draggingSong.index + 1,
                        indexInQueue + 1
                    ),
                    draggingSong.song,
                    ...tempQueue.slice(indexInQueue + 1),
                ]);
            } else {
                queue.set([
                    ...tempQueue.slice(0, indexInQueue),
                    draggingSong.song,
                    ...tempQueue.slice(indexInQueue, draggingSong.index),
                    ...tempQueue.slice(draggingSong.index + 1),
                ]);
            }
        };

        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("touchend", handleTouchEnd);
        return () => {
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [draggingSong]);

    const $lang = useStore(langData);
    if (!$lang) return;

    if (!$queue) return <div>Queue is not defined</div>;

    return (
        <div
            id="MobilePlayerUIQueue"
            className={
                "absolute w-full top-[80px] h-[calc(100%_-_5rem)] grid grid-rows-[40px_1fr] bg-gray-700 rounded-t-lg z-50 pt-4 pl-2 transition-[top] duration-300 md:select-text select-none"
            }
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full max-h-full min-h-0 font-semibold min-w-0 max-w-full w-full text-center text-xl text-nowrap "
                onClick={() => {
                    setOpen(false);
                }}
            >
                Queue
            </label>
            <div className="h-full max-h-full min-h-0 relative min-w-0 max-w-full w-full">
                <div
                    ref={scrollRef}
                    onScroll={(e) => setQueueScroll(e.currentTarget.scrollTop)}
                    className={
                        "h-full max-h-full min-h-0 relative " +
                        (draggingSong == undefined
                            ? " overflow-y-auto "
                            : " overflow-y-hidden ")
                    }
                >
                    <div className="min-h-5"></div>
                    <div style={{ height: $queue.length * 64 }}></div>
                    {$queue.map((song, index) => {
                        if (!scrollRef.current) return;

                        let top: number;

                        let draggingTop: number | undefined;

                        if (draggingSong)
                            draggingTop = Math.max(
                                draggingPosY -
                                    185 +
                                    scrollRef.current.scrollTop,
                                0
                            );

                        if (
                            draggingSong?.song.song.id == song.song.id &&
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
                                key={song.song.id + song.index}
                                id={song.song.id + song.index}
                                className={
                                    "absolute w-full " +
                                    (draggingSong?.song.song.id == song.song.id
                                        ? " z-10 "
                                        : " transition-[top] duration-500 ")
                                }
                                style={{
                                    top: `${top + 20}px`,
                                    transitionTimingFunction:
                                        "cubic-bezier(1,-0.53, 0.09, 1.58)",
                                }}
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger>
                                        <div className="grid grid-cols-[1fr_45px] items-center">
                                            <div className="min-w-0 max-w-full w-full">
                                                <QueueSong
                                                    key={song.index}
                                                    song={song}
                                                />
                                            </div>
                                            <GripVertical
                                                className="h-full w-full p-1 pr-3"
                                                onTouchStart={(e) =>
                                                    touchStart(e, song, index)
                                                }
                                            />
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent
                                        cover={getImageUrl({
                                            imageId: song.song.image,
                                        })}
                                        title={song.song.name}
                                        description={
                                            song.song.albumName +
                                            " • " +
                                            song.song.artists
                                                .map((artist) => artist.name)
                                                .join(", ")
                                        }
                                    >
                                        <ContextMenuOption
                                            onClick={() => handlePlaySong(song)}
                                        >
                                            <PlayCircle className="h-5 w-5" />
                                            {$lang.play_song}
                                        </ContextMenuOption>
                                        <ContextMenuOption
                                            onClick={() =>
                                                handleRemoveSong(song)
                                            }
                                        >
                                            <ListX className="h-5 w-5" />
                                            {$lang.remove_from_queue}
                                        </ContextMenuOption>
                                        <ContextMenuOption
                                            onClick={() => {
                                                saveSongToIndexedDB(
                                                    song.song,
                                                    true
                                                );
                                            }}
                                        >
                                            <HardDriveDownload className="h-5 w-5" />
                                            {$lang.download_song_to_device}
                                        </ContextMenuOption>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </div>
                        );
                    })}
                    <div className="min-h-10"></div>
                </div>
                <div className="absolute w-full -top-1 h-10 bg-gradient-to-t from-transparent to-gray-700"></div>
                <div className="absolute w-full bottom-0 h-10 bg-gradient-to-b from-transparent to-gray-700"></div>
            </div>
        </div>
    );
}
