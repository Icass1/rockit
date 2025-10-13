import { rockIt } from "@/lib/rockit/rockIt";
import { useStore } from "@nanostores/react";
import { ChevronUp } from "lucide-react";

export default function TogglePlayerUI() {
    const $visible = useStore(rockIt.playerUIManager.visibleAtom);

    return (
        <div
            className="relative h-6 w-6 rounded border-[2.4px] border-solid border-gray-400 text-gray-400 transition-all md:hover:border-white md:hover:text-white"
            onClick={() => {
                console.log("(TogglePlayerUI)");
                rockIt.playerUIManager.toggle();
            }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <ChevronUp
                    className="h-6 w-5 cursor-pointer transition-all duration-500 ease-in-out"
                    style={{ rotate: $visible ? "-180deg" : "0deg" }}
                />
            </div>
        </div>
    );
}
