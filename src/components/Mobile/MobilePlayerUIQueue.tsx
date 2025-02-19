import { queue, queueIndex } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { QueueSong } from "@/components/PlayerUI/QueueSong";
import useWindowSize from "@/hooks/useWindowSize";
import { useEffect, useRef } from "react";

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

    useEffect(() => {
        if (!scrollRef.current) return;

        const currentSongIndexInQueue = queue
            .get()
            .findIndex((song) => song.index == queueIndex.get());

        scrollRef.current.scrollTo(0, currentSongIndexInQueue * 64 - 100);
    }, [scrollRef]);

    return (
        <div
            id="MobilePlayerUIQueue"
            className={
                "absolute w-full top-[80px] h-[calc(100%_-_5rem)] grid grid-rows-[40px_1fr] bg-gray-700 rounded-t-lg z-50 pt-4 px-2 transition-[top] duration-300"
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
                    className="overflow-y-auto h-full max-h-full min-h-0 relative scroll-smooth"
                >
                    <div className="min-h-5"></div>
                    {$queue.map((song) => (
                        <QueueSong key={song.index} song={song}></QueueSong>
                    ))}
                    <div className="min-h-10"></div>
                </div>
                <div className="absolute w-full -top-1 h-10 bg-gradient-to-t from-transparent to-gray-700"></div>
                <div className="absolute w-full bottom-0 h-10 bg-gradient-to-b from-transparent to-gray-700"></div>
            </div>
        </div>
    );
}
