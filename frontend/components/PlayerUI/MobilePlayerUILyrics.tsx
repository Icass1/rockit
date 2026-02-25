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
                "absolute top-20 z-50 grid h-[calc(100%-5rem)] w-full grid-rows-[40px_1fr] rounded-t-lg bg-gray-700 pt-4 transition-[top] duration-300 select-none md:select-text"
            }
            style={{ top: open ? "80px" : height + "px" }}
        >
            <label
                className="h-full max-h-full min-h-0 w-full max-w-full min-w-0 text-center text-xl font-semibold text-nowrap"
                onClick={() => {
                    setOpen(false);
                }}
            >
                Lyrics
            </label>
            <div className="relative h-full max-h-full min-h-0 w-full max-w-full min-w-0">
                <DynamicLyrics />
            </div>
        </div>
    );
}
