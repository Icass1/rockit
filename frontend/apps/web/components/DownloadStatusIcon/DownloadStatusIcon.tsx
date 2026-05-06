"use client";

import { useEffect, useState } from "react";
import { EEvent, IMediaDownloadStatus } from "@rockit/packages/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export function DownloadStatusIcon({ publicId }: { publicId: string }) {
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
        const handler = (event: IMediaDownloadStatus) => {
            if (event.publicId !== publicId) return;
            setProgress(event.completed < 100 ? event.completed : null);
        };

        rockIt.eventManager.addEventListener(EEvent.MediaDownloadStatus, handler);
        return () => {
            rockIt.eventManager.removeEventListener(EEvent.MediaDownloadStatus, handler);
        };
    }, [publicId]);

    if (progress === null) return null;

    const circumference = 2 * Math.PI * 8;

    return (
        <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#404040" strokeWidth="2" />
            <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="#ee1086"
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                strokeLinecap="round"
                transform="rotate(-90 10 10)"
            />
            <path
                d="M10 6v5M7 9l3 3 3-3"
                stroke="#ee1086"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}
