import { queue } from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";
import { useStore } from "@nanostores/react";
import { Heart, ListEnd, ListStart, Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AddToQueue({ type, id }: { type: string; id: string }) {
    const $songs = useStore(currentListSongs);

    const [open, setOpen] = useState(false);
    const [hidden, setHidden] = useState(false);

    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            // Wait for animation to finish and hide the popup
            setTimeout(() => {
                setHidden(true);
            }, 300);
        } else {
            setHidden(false);
        }
    }, [open]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!divRef.current?.contains(event.target as HTMLElement)) {
                setOpen(false);
            }
        };

        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, []);

    const addListToBottomQueue = () => {
        setOpen(false);
        const songsToAdd = $songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        queue.set([...queue.get(), ...songsToAdd]);
    };
    const addListToTopQueue = () => {
        setOpen(false);
        const songsToAdd = $songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        queue.set([...songsToAdd, ...queue.get()]);
    };

    return (
        <div className="relative">
            <div
                className="absolute left-2 top-10 bg-[#2f2f2f] rounded overflow-hidden whitespace-nowrap transition-[opacity] duration-300"
                style={{
                    opacity: open ? 1 : 0,
                    display: hidden ? "none" : "block",
                }}
            >
                <ul className="text-white text-sm">
                    <div
                        className="md:hover:bg-[#4f4f4f] flex items-center p-3 space-x-2 cursor-pointer rounded-t-lg"
                        onClick={addListToTopQueue}
                    >
                        <ListStart className="h-5 w-5" />
                        <span>Add list to top of queue</span>
                    </div>
                </ul>

                <ul className="text-white text-sm">
                    <div
                        className="md:hover:bg-[#4f4f4f] flex items-center p-3 space-x-2 cursor-pointer rounded-t-lg"
                        onClick={addListToBottomQueue}
                    >
                        <ListEnd className="h-5 w-5" />
                        <span>Add list to bottom of queue</span>
                    </div>
                </ul>

                <ul className="text-white text-sm">
                    <div
                        className="md:hover:bg-[#4f4f4f] flex items-center p-3 space-x-2 cursor-pointer rounded-t-lg"
                    >
                        <Heart className="h-5 w-5" />
                        <span>Like all songs on the list</span>
                    </div>
                </ul>
            </div>
            <div
                className="w-7 h-7 relative cursor-pointer whitespace-nowrap md:hover:scale-105"
                onClick={() => setOpen(true)}
                ref={divRef}
            >
                <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-7 h-7"></div>
                <Ellipsis
                    strokeWidth={1.3}
                    className="h-4 w-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            </div>
        </div>
    );
}
