import useWindowSize from "@/hooks/useWindowSize";
import type React from "react";
import { DynamicLyrics } from "../PlayerUI/DynamicLyrics";

export default function MobilePlayerUILyrics({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const { height } = useWindowSize();

    return (
        <div
            id="MobilePlayerUILyrics"
            className={
                "absolute w-full top-[80px] h-[calc(100%_-_5rem)] grid grid-rows-[40px_1fr] bg-gray-700 rounded-t-lg z-50 pt-4 transition-[top] duration-300 md:select-text select-none"
            }
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full max-h-full min-h-0 font-semibold min-w-0 max-w-full w-full text-center text-xl text-nowrap "
                onClick={() => {
                    setOpen(false);
                }}
            >
                Lyrics
            </label>
            <div className="h-full max-h-full min-h-0 relative min-w-0 max-w-full w-full">
                <DynamicLyrics />
            </div>
        </div>
    );
}
