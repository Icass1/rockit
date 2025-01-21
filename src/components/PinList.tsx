import { pinnedLists } from "@/stores/pinnedLists";
import { useStore } from "@nanostores/react";
import { Pin, PinOff } from "lucide-react";

export const pinListHandleClick = ({
    id,
    type,
}: {
    id: string;
    type: string;
}) => {
    // Determina si el elemento ya está en la lista
    const isPinned = pinnedLists.get().some((list) => list.id === id);

    if (isPinned) {
        // Si ya está en la lista, elimínalo
        fetch(`/api/unpin/${type}/${id}`, { method: "DELETE" })
            .then((response) => response.json())
            .then(() => {
                const updatedLists = pinnedLists
                    .get()
                    .filter((list) => list.id !== id);
                pinnedLists.set(updatedLists);
            });
    } else {
        // Si no está en la lista, añádelo
        fetch(`/api/pin/${type}/${id}`, { method: "POST" })
            .then((response) => response.json())
            .then((data) => {
                pinnedLists.set([...pinnedLists.get(), data]);
            });
    }
};

export default function PinList({ type, id }: { type: string; id: string }) {
    const $pinnedLists = useStore(pinnedLists);

    // Determina si el elemento ya está en la lista
    const isPinned = $pinnedLists.some((list) => list.id === id);

    return (
        <div
            className="w-7 h-7 relative md:hover:scale-105 cursor-pointer"
            onClick={() => pinListHandleClick({ type, id })}
        >
            <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-7 h-7"></div>
            {isPinned ? (
                <PinOff
                    strokeWidth={1.3}
                    className="h-4 w-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            ) : (
                <Pin
                    strokeWidth={1.3}
                    className="h-4 w-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            )}
        </div>
    );
}
