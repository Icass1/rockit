import { queue, queueIndex } from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import { Ellipsis, Heart, ListEnd, ListStart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ListOptions({
    type,
    id,
}: {
    type: string;
    id: string;
}) {
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
        const tempQueue = queue.get();
        if (!tempQueue) return;

        setOpen(false);
        const songsToAdd = $songs.map((song, index) => {
            return {
                song: song,
                list: { type, id },
                index:
                    Math.max(...tempQueue.map((_song) => _song.index)) +
                    index +
                    1,
            };
        });
        queue.set([...tempQueue, ...songsToAdd]);
    };
    const addListToTopQueue = () => {
        setOpen(false);

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const songsToAdd = $songs.map((song, index) => {
            return {
                song: song,
                list: { type, id },
                index:
                    Math.max(...tempQueue.map((_song) => _song.index)) +
                    index +
                    1,
            };
        });
        const index = tempQueue.findIndex(
            (_song) => _song.index == queueIndex.get()
        );

        console.log(index);

        queue.set([
            ...tempQueue.slice(0, index + 1),
            ...songsToAdd,
            ...tempQueue.slice(index + 1),
        ]);
    };

    const likeAllSongs = () => {
        $songs.map((song) => {
            fetch(`/api/like/${song.id}`, { method: "POST" }).then(
                (response) => {
                    if (response.ok) {
                        // Add song to liked songs store
                        likedSongs.set([...likedSongs.get(), song.id]);
                    } else {
                        console.log("Error");
                        // Tell user like request was unsuccessful
                    }
                }
            );
        });
    };

    return (
        <div className="relative">
            <div
                className="absolute md:left-2 -left-20 top-10 p-1 bg-neutral-800/90 backdrop-blur-3xl shadow-[0px_0px_20px_3px_#0e0e0e] rounded overflow-hidden whitespace-nowrap transition-[opacity] duration-300"
                style={{
                    opacity: open ? 1 : 0,
                    display: hidden ? "none" : "block",
                }}
            >
                <ul className="text-white text-sm">
                    <div
                        className="hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2"
                        onClick={addListToTopQueue}
                    >
                        <ListStart className="h-5 w-5" />
                        <span>Add list to top of queue</span>
                    </div>
                </ul>

                <ul className="text-white text-sm">
                    <div
                        className="hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2"
                        onClick={addListToBottomQueue}
                    >
                        <ListEnd className="h-5 w-5" />
                        <span>Add list to bottom of queue</span>
                    </div>
                </ul>

                <ul className="text-white text-sm">
                    <div
                        className="hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2"
                        onClick={likeAllSongs}
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
