import { pinnedLists } from "@/stores/pinnedLists";
import { PlusCircle } from "lucide-react";

export default function PinList({ type, id }: { type: string; id: string }) {
    const handleClick = () => {
        fetch(`/api/pin/${type}/${id}`)
            .then((response) => response.json())
            .then((data) => {
                pinnedLists.set([...pinnedLists.get(), data]);
            });
    };

    return (
        <PlusCircle
            onClick={handleClick}
            strokeWidth={0.9}
            className="h-10 w-10 hover:scale-105 transition-transform"
        />
    );
}
