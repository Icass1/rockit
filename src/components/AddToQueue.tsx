import type { SongDB } from "@/lib/db";
import { queue } from "@/stores/audio";
import { List, ListEnd, ListStart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AddToQueue({
    songs,
    type,
    id,
}: {
    type: string;
    id: string;
    songs: SongDB<
        | "id"
        | "name"
        | "artists"
        | "images"
        | "duration"
        | "albumId"
        | "albumName"
    >[];
}) {
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
        const songsToAdd = songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        queue.set([...queue.get(), ...songsToAdd]);
    };
    const addListToTopQueue = () => {
        setOpen(false);
        const songsToAdd = songs.map((song) => {
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
            </div>
            <div
                className="w-10 h-10 relative cursor-pointer whitespace-nowrap"
                onClick={() => setOpen(true)}
                ref={divRef}
            >
                <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-9 h-9"></div>
                <List
                    strokeWidth={1.3}
                    className="h-5 w-5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            </div>
        </div>
    );
}
