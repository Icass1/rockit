"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import PlayerUIContent from "@/components/PlayerUI/Content";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function PlayerUI(): JSX.Element | null {
    const $isPlayerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);

    const vocabulary = useVocabulary();

    return (
        <div
            role="region"
            aria-label={vocabulary.NOW_PLAYING}
            aria-hidden={!$isPlayerUIVisible}
            inert={!$isPlayerUIVisible}
            className="bg-backdrop/80 absolute inset-0 flex items-center justify-center overflow-hidden pb-24 pl-12 transition-all duration-300"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100%)",
            }}
        >
            <PlayerUIContent />
        </div>
    );
}
