import {
    queue,
    queueIndex,
    saveSongToIndexedDB,
    type QueueElement,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
import useWindowSize from "@/hooks/useWindowSize";
import { useEffect, useRef, useState } from "react";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenuOption from "../ContextMenu/Option";
import { getImageUrl } from "@/lib/getImageUrl";
import { HardDriveDownload, ListX, PlayCircle } from "lucide-react";
import { langData } from "@/stores/lang";

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

    useEffect(() => {
        if (!scrollRef.current) return;
        if (!open) return;

        const currentSongIndexInQueue = queue
            .get()
            .findIndex((song) => song.index == queueIndex.get());

        scrollRef.current.scrollTo(0, currentSongIndexInQueue * 64 - 100);
    }, [scrollRef, open]);

    const handleRemoveSong = (song: QueueElement) => {
        if (song.index == queueIndex.get()) {
            // Alert the user that the song is currently playing cannot be removed.
            return;
        }
        const index = queue
            .get()
            .findIndex((_song) => _song.index == song.index);

        queue.set([
            ...queue.get().slice(0, index),
            ...queue.get().slice(index + 1),
        ]);
    };
    const handlePlaySong = (song: QueueElement) => {
        console.log("handlePlaySong");
        // console.log(queue.get(), song, queueIndex.get());
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div
            id="MobilePlayerUIQueue"
            className={
                "absolute w-full top-[80px] h-[calc(100%_-_5rem)] grid grid-rows-[40px_1fr] bg-gray-700 rounded-t-lg z-50 pt-4 px-2 transition-[top] duration-300 md:select-text select-none"
            }
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full max-h-full min-h-0 font-semibold min-w-0 max-w-full w-full text-center text-xl "
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
                    className="overflow-y-auto h-full max-h-full min-h-0 relative scroll-smooth"
                >
                    <div className="min-h-5"></div>
                    <div style={{ height: $queue.length * 64 }}></div>
                    {$queue.map((song, index) => {
                        if (!scrollRef.current) return;

                        const top = index * 64;

                        if (
                            (scrollRef.current?.offsetHeight &&
                                top >
                                    scrollRef.current?.offsetHeight +
                                        queueScroll) ||
                            top < queueScroll - 64
                        ) {
                            return;
                        }

                        return (
                            <div
                                key={song.song.id + song.index}
                                id={song.song.id + song.index}
                                className="absolute w-full transition-[top]"
                                style={{
                                    top: `${top + 20}px`,
                                }}
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger>
                                        <QueueSong
                                            key={song.index}
                                            song={song}
                                        />
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
                                                saveSongToIndexedDB(song.song, true);
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
