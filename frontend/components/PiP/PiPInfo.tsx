"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import LikeButton from "@/components/LikeButton";

const S = {
    infoRow: {
        marginTop: "10px",
        display: "flex",
        width: "100%",
        maxWidth: "300px",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        boxSizing: "border-box",
    },
    infoText: {
        color: "white",
        overflow: "hidden",
        flex: 1,
        paddingRight: "0.5rem",
    },
    songName: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    artistName: {
        fontSize: "0.875rem",
        opacity: 0.75,
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
};

export function PiPInfo() {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);

    return (
        <div style={S.infoRow as React.CSSProperties}>
            <div style={S.infoText as React.CSSProperties}>
                <p style={S.songName as React.CSSProperties}>
                    {$currentSong?.name}
                </p>
                <p style={S.artistName as React.CSSProperties}>
                    {$currentSong?.artists.map((a) => a.name).join(", ")}
                </p>
            </div>
            {$currentSong && (
                <LikeButton songPublicId={$currentSong.publicId} />
            )}
        </div>
    );
}
