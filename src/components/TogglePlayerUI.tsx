import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { ChevronUp } from "lucide-react";

export default function TogglePlayerUI() {
    const $isPlayerUIVisible = useStore(isPlayerUIVisible);

    return (
        <div
            className="border-solid w-6 h-6 border-gray-400 border-[2.4px] rounded relative hover:border-white text-gray-400 hover:text-white transition-all"
            onClick={() => {
                isPlayerUIVisible.set(!$isPlayerUIVisible);
            }}
            id="toggle-player-ui"
        >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <ChevronUp
                    className="w-5 h-6 transition-all cursor-pointer duration-500 ease-in-out"
                    style={{ rotate: $isPlayerUIVisible ? "-180deg" : "0deg" }}
                />
            </div>
        </div>
    );
}
