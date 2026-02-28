"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { PiPControls } from "@/components/PiP/PiPControls";
import { PiPProgress } from "@/components/PiP/PiPProgress";

const S = {
    coverWrapper: {
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        userSelect: "none",
    },
    cover: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "0.5rem",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        display: "block",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxSizing: "border-box",
    },
};

interface PiPCoverProps {
    showControls: boolean;
}

export function PiPCover({ showControls }: PiPCoverProps) {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);

    return (
        <div style={S.coverWrapper as React.CSSProperties}>
            {$currentSong?.internalImageUrl && (
                <Image
                    src={`/api/image/${$currentSong.internalImageUrl}`}
                    alt={`Cover of ${$currentSong.name}`}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                />
            )}

            {showControls && (
                <div style={S.overlay as React.CSSProperties}>
                    <PiPControls show={showControls} />
                    <PiPProgress show={showControls} />
                </div>
            )}
        </div>
    );
}
