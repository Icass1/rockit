"use client";

import useWindowSize from "@/hooks/useWindowSize";
import type React from "react";
import { DynamicLyrics } from "@/components/PlayerUI/DynamicLyrics";

export default function MobilePlayerUILyrics({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const { height } = useWindowSize();

    if (!height) return;

    return (
        <div
            id="MobilePlayerUILyrics"
            className={
                "absolute top-[80px] z-50 grid h-[calc(100%_-_5rem)] w-full select-none grid-rows-[40px_1fr] rounded-t-lg bg-gray-700 pt-4 transition-[top] duration-300 md:select-text"
            }
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full max-h-full min-h-0 w-full min-w-0 max-w-full text-nowrap text-center text-xl font-semibold"
                onClick={() => {
                    setOpen(false);
                }}
            >
                Lyrics
            </label>
            <div className="relative h-full max-h-full min-h-0 w-full min-w-0 max-w-full">
                <DynamicLyrics />
            </div>
        </div>
    );
}
