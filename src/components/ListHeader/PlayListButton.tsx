import { playListHandleClick } from "../PlayList";
import { pause, play, playing, queue, queueIndex } from "@/stores/audio";
import { currentList } from "@/stores/currentList";
import { downloadedLists, downloads } from "@/stores/downloads";
import { useStore } from "@nanostores/react";

import { Download, Pause, Play } from "lucide-react";

export default function PlayListButton({
    id,
    type,
    inDatabase,
    url,
}: {
    id: string;
    type: string;
    inDatabase: boolean;
    url: string;
}) {
    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);
    const $currentList = useStore(currentList);
    const $playing = useStore(playing);
    const $downloadedLists = useStore(downloadedLists);

    const playingList =
        $queue &&
        $queue.find((song) => song.index == $queueIndex)?.list?.id ==
            $currentList?.id &&
        $queue.find((song) => song.index == $queueIndex)?.list?.type ==
            $currentList?.type;

    let icon;

    if (!inDatabase && !$downloadedLists.includes(id)) {
        icon = (
            <Download className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2" />
        );
    } else if (playingList && $playing) {
        icon = (
            <Pause
                className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2"
                fill="white"
            />
        );
    } else {
        icon = (
            <Play
                className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2"
                fill="white"
            />
        );
    }

    return (
        <div
            onClick={() => {
                if (!inDatabase && !$downloadedLists.includes(id)) {
                    fetch(`/api/start-download?url=${url}`).then((response) => {
                        response.json().then((data) => {
                            downloads.set([
                                data.download_id,
                                ...downloads.get(),
                            ]);
                        });
                    });
                } else if (playingList && $playing) {
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
            className="absolute bottom-3 right-3 md:w-20 md:h-20 h-16 w-16 bg-gradient-to-r md:hover:scale-105 cursor-pointer transition-transform from-[#ee1086] to-[#fb6467] rounded-full shadow-[0px_0px_20px_3px_#0e0e0e]"
        >
            {icon}
        </div>
    );
}
