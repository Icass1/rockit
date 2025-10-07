import { rockIt } from "@/lib/rockit/rockIt";
import { DBListType } from "@/types/rockIt";
import { Download } from "lucide-react";
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

export default function DownloadListButton({
    publicId,
    type,
}: {
    publicId: string;
    type: DBListType;
}) {
    const divRef = useRef<HTMLDivElement>(null);

    const [flyAnim, setFlyAnim] = useState<null | {
        start: DOMRect;
        end: DOMRect;
    }>(null);

    return (
        <>
            <div
                ref={divRef}
                onClick={() => {
                    rockIt.downloaderManager.downloadSpotifyListToDBAsync(
                        type,
                        publicId
                    );
                }}
                className="h-16 w-16 cursor-pointer rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-20 md:w-20 md:hover:scale-105"
            >
                <Download className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
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
