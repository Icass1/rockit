"use client";

import type { JSX } from "react";
import { ChevronUp } from "lucide-react";
import { usePlaybackStore } from "@/hooks/usePlaybackStore";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function TogglePlayerUI(): JSX.Element {
    const vocabulary = useVocabulary();
    const { playerUIManager } = usePlaybackServices();
    const $visible = usePlaybackStore(playerUIManager.visibleAtom, false);

    return (
        <button
            aria-label={
                $visible ? vocabulary.PLAYER_HIDE : vocabulary.PLAYER_SHOW
            }
            className="border-border-strong text-muted-foreground md:hover:border-foreground-strong md:hover:text-foreground-strong relative h-6 w-6 rounded border-[2.4px] transition-all"
            onClick={(): void => playerUIManager.toggle()}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <ChevronUp
                    className="h-6 w-5 cursor-pointer transition-all duration-500 ease-in-out"
                    style={{ rotate: $visible ? "-180deg" : "0deg" }}
                />
            </div>
        </button>
    );
}
