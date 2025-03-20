import { playListHandleClick } from "../PlayList";
import { pause, play, playing, queue, queueIndex } from "@/stores/audio";
import { currentList } from "@/stores/currentList";
import { useStore } from "@nanostores/react";

import { Pause, Play } from "lucide-react";

export default function PlayListButton({
    id,
    type,
}: {
    id: string;
    type: string;
}) {
    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);
    const $currentList = useStore(currentList);
    const $playing = useStore(playing);

    const playingList =
        $queue &&
        $queue.find((song) => song.index == $queueIndex)?.list?.id ==
            $currentList?.id &&
        $queue.find((song) => song.index == $queueIndex)?.list?.type ==
            $currentList?.type;

    return (
        <div
            onClick={() => {
                if (playingList && $playing) {
                    pause();
                } else if (playingList) {
                    play();
                } else {
                    playListHandleClick({
                        type: type,
                        id,
                    });
                }
            }}
            className="absolute bottom-3 right-3 w-16 h-16 bg-gradient-to-r hover:scale-105 cursor-pointer transition-transform from-[#ee1086] to-[#fb6467] rounded-full shadow-[0px_0px_20px_3px_#0e0e0e]"
        >
            {playingList && $playing ? (
                <Pause
                    className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8"
                    fill="white"
                />
            ) : (
                <Play
                    className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8"
                    fill="white"
                />
            )}
        </div>
    );
}
