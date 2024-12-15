import type { SongDB } from "@/lib/db";
import { queue } from "@/stores/audio";
import { List, ListEnd, ListStart } from "lucide-react";
import { useEffect, useState } from "react";

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
    const handleClick = () => {};

    const [hover, setHover] = useState<boolean>(false);
    const [popUpHidden, setPopUpHidden] = useState<boolean>(true);

    useEffect(() => {
        if (!hover) {
            // Wait for animation to finish and hide the popup
            setTimeout(() => {
                setPopUpHidden(true);
            }, 300);
        } else {
            setPopUpHidden(false);
        }
    }, [hover]);

    const addListToBottomQueue = () => {
        setHover(false);
        const songsToAdd = songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        queue.set([...queue.get(), ...songsToAdd]);
    };
    const addListToTopQueue = () => {
        setHover(false);
        const songsToAdd = songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        queue.set([...songsToAdd, ...queue.get()]);
    };

    return (
        <div className="relative">
            <div
                className="absolute top-10 bg-black bg-opacity-70 rounded overflow-hidden whitespace-nowrap transition-[opacity] duration-300"
                style={{
                    opacity: hover ? 1 : 0,
                    display: popUpHidden ? "none" : "block",
                }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <div
                    className="flex flex-row hover:bg-black/40 p-2 items-center gap-1"
                    onClick={addListToTopQueue}
                >
                    <ListStart className="h-5 w-5" />
                    <label className="text-sm">Add list to top of queue</label>
                </div>
                <div
                    className="flex flex-row hover:bg-black/40 p-2 items-center gap-1"
                    onClick={addListToBottomQueue}
                >
                    <ListEnd className="h-5 w-5" />
                    <label className="text-sm">
                        Add list to bottom of queue
                    </label>
                </div>
            </div>
            <div
                className="w-10 h-10 relative cursor-pointer whitespace-nowrap"
                onClick={handleClick}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-9 h-9"></div>
                <List
                    strokeWidth={1.3}
                    className="h-6 w-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            </div>
        </div>
    );
}
