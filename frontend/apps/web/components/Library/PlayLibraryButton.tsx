import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayLibraryButton(): JSX.Element {
    let icon;

    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );

    const playingLibrary = $queue?.find(
        (queueSong): boolean =>
            queueSong.queueMediaId === $currentQueueMediaId &&
            queueSong?.listPublicId === "library"
    )
        ? true
        : false;

    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    if (playingLibrary && $playing) {
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
        <>
            <div
                onClick={(): void => {
                    if (playingLibrary && $playing) {
                        rockIt.mediaPlayerManager.play();
                    } else if (playingLibrary) {
                        rockIt.mediaPlayerManager.pause();
                    } else {
                        console.warn("PlayLibraryButton playLibraryHandler");
                    }
                }}
                title="Play albums in library"
                className="h-6 w-6 cursor-pointer rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-8 md:w-8 md:hover:scale-105"
            >
                {icon}
            </div>
        </>
    );
}
