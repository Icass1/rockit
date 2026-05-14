"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayerUILyrics(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <div className="relative h-full w-full">
            <label className="-transalte-y-1/2 absolute top-1/2 left-1/2 -translate-x-1/2 text-xl font-semibold">
                {$vocabulary.NO_LYRICS}
            </label>
        </div>
    );
}
