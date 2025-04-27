import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { ChevronUp } from "lucide-react";

export default function TogglePlayerUI() {
    const $isPlayerUIVisible = useStore(isPlayerUIVisible);

    return (
        <div
            className="relative h-6 w-6 rounded border-[2.4px] border-solid border-gray-400 text-gray-400 transition-all md:hover:border-white md:hover:text-white"
            onClick={() => {
                isPlayerUIVisible.set(!$isPlayerUIVisible);
            }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <ChevronUp
                    className="h-6 w-5 cursor-pointer transition-all duration-500 ease-in-out"
                    style={{ rotate: $isPlayerUIVisible ? "-180deg" : "0deg" }}
                />
            </div>
        </div>
    );
}
