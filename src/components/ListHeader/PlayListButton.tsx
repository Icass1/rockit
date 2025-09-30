import { rockitIt } from "@/lib/rockit";
import { useStore } from "@nanostores/react";

import { Pause, Play } from "lucide-react";
import { useRef } from "react";

export default function PlayListButton({
    id,
    type,
}: {
    id: string;
    type: string;
}) {
    const $playing = useStore(rockitIt.audioManager.playingAtom);

    const divRef = useRef<HTMLDivElement>(null);

    const playingList = false;

    let icon;

    if (playingList && $playing) {
        icon = (
            <Pause
                className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    } else {
        icon = (
            <Play
                className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    }

    return (
        <div
            ref={divRef}
            onClick={() => {}}
            className="h-16 w-16 cursor-pointer rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-20 md:w-20 md:hover:scale-105"
        >
            {icon}
        </div>
    );
}
