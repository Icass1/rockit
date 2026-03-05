"use client";

import { DynamicLyrics } from "@/components/PlayerUI/DynamicLyrics";

export function PlayerUILyricsColumn() {
    return (
        <div className="relative z-10 hidden h-full w-full lg:block">
            <h2 className="absolute mx-auto block w-full select-none p-14 text-center text-3xl font-bold">
                Lyrics
            </h2>
            <DynamicLyrics />
        </div>
    );
}
