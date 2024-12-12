import {
    pause,
    play,
    playing,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import {
    Play,
    Pause
} from "lucide-react";

export default function FooterLeftMobile() {
    const $playing = useStore(playing);

    return (
        <div
            className="flex md:hidden items-center w-[10%] h-full justify-end pr-3 md:pr-0 gap-x-3 group"
        >
            {$playing ? (
                <Pause 
                    className="w-5 h-5 text-white fill-current" 
                    onClick={pause}
                />
            ) : (
                <Play className="w-5 h-5 text-white fill-current"
                    onClick={play}
                />
            )}
        </div>
    );
}
