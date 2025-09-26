import { playListHandleClick } from "@/components/PlayList";
import { useStore } from "@nanostores/react";

import { Download, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function DownloadFlyAnimation({
    start,
    end,
    onEnd,
}: {
    start: DOMRect;
    end: DOMRect;
    onEnd: () => void;
}) {
    // Calculate the control point for the U-shape (higher y, midpoint x)
    const controlX = (start.left + end.left) / 2;
    const controlY = Math.min(start.top, end.top) - 120; // 120px above the highest point

    // Use inline styles for positioning
    const style: React.CSSProperties = {
        position: "fixed",
        left: start.left,
        top: start.top,
        pointerEvents: "none",
    };

    // Keyframes for U-curve using CSS motion path
    // You can put this in your global CSS or a <style> tag
    // See below for the CSS

    // Remove the icon after animation
    useEffect(() => {
        const timer = setTimeout(onEnd, 700);
        return () => clearTimeout(timer);
    }, [onEnd]);

    // Use CSS variables for the end and control points
    return createPortal(
        <div
            style={
                {
                    ...style,
                    "--start-x": `${start.left}px`,
                    "--start-y": `${start.top}px`,
                    "--end-x": `${end.left}px`,
                    "--end-y": `${end.top}px`,
                    "--control-x": `${controlX}px`,
                    "--control-y": `${controlY}px`,
                } as React.CSSProperties
            }
            className="download-fly-animation rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
        >
            <Download className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>,
        document.body
    );
}

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

    const divRef = useRef<HTMLDivElement>(null);

    const [flyAnim, setFlyAnim] = useState<null | {
        start: DOMRect;
        end: DOMRect;
    }>(null);

    const playingList =
        $queue &&
        $queue.find((song) => song.index == $queueIndex)?.list?.id ==
            $currentList?.id &&
        $queue.find((song) => song.index == $queueIndex)?.list?.type ==
            $currentList?.type;

    let icon;

    if (!inDatabase && !$downloadedLists.includes(id)) {
        icon = (
            <Download className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else if (playingList && $playing) {
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

    const handleDownload = () => {
        startDownload(url);
        const startPos = divRef.current?.getBoundingClientRect();
        const endPos = document
            .querySelector("#navigation-Downloads")
            ?.getBoundingClientRect();
        if (startPos && endPos) {
            setFlyAnim({ start: startPos, end: endPos });
        }
    };

    return (
        <>
            <div
                ref={divRef}
                onClick={() => {
                    if (!inDatabase && !$downloadedLists.includes(id)) {
                        handleDownload();
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
                className="absolute right-3 bottom-3 h-16 w-16 cursor-pointer rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-20 md:w-20 md:hover:scale-105"
            >
                {icon}
            </div>
            {flyAnim && (
                <DownloadFlyAnimation
                    start={flyAnim.start}
                    end={flyAnim.end}
                    onEnd={() => {
                        setFlyAnim(null);
                    }}
                />
            )}
        </>
    );
}
