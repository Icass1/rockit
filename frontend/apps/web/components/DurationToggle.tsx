"use client";

import { useState, type JSX } from "react";
import { formatDuration, type DurationStyle } from "@rockit/shared";

export default function DurationToggle({
    durationMs,
}: {
    durationMs: number;
}): JSX.Element | null {
    const [style, setStyle] = useState<DurationStyle>("normal");

    if (durationMs === 0) return null;

    const display = formatDuration(durationMs, style);

    return (
        <button
            type="button"
            onClick={() =>
                setStyle((prev) =>
                    prev === "normal" ? "minutes" : "normal"
                )
            }
            className="cursor-pointer hover:underline"
        >
            • {display}
        </button>
    );
}
