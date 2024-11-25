import { pinnedLists } from "@/stores/pinnedLists";
import { useStore } from "@nanostores/react";
import { Pin } from "lucide-react";

export default function PinList({ type, id }: { type: string; id: string }) {
    const handleClick = () => {
        fetch(`/api/pin/${type}/${id}`)
            .then((response) => response.json())
            .then((data) => {
                pinnedLists.set([...pinnedLists.get(), data]);
            });
    };

    const $pinnedLists = useStore(pinnedLists);
    const list = $pinnedLists.find((list) => list.id == id);

    if (list) {
        return <></>
    }

    return (
        <div
            className="w-10 h-10 relative hover:scale-105"
            onClick={handleClick}
        >
            <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-9 h-9"></div>
            <Pin
                strokeWidth={1.3}
                className="h-6 w-6  left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
            />
        </div>
    );
}
