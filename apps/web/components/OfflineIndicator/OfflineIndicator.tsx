"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import { CircleCheck } from "lucide-react";
import { offlineStatusMap } from "@/lib/offline/store";

export function OfflineIndicator({
    publicId,
    className,
}: {
    publicId: string;
    className?: string;
}): JSX.Element | null {
    const $status = useStore(offlineStatusMap);
    const status = $status[publicId];

    if (status !== "downloaded") return null;

    return (
        <CircleCheck
            className={`shrink-0 text-(--color-rockit-pink) ${className ?? ""}`}
        />
    );
}
