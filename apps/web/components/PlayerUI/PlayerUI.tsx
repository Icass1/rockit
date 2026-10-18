"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import PlayerUIContent from "@/components/PlayerUI/Content";

export default function PlayerUI(): JSX.Element | null {
    const $isPlayerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);

    const innerWidth = useWindowSize().width;
    const shouldRender = innerWidth !== undefined && innerWidth > 768;

    // Scroll queue to current song when player opens
    if (!shouldRender) return null;

    return (
        <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/80 pb-24 pl-12 transition-all duration-300"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100%)",
            }}
        >
            <PlayerUIContent />
        </div>
    );
}
