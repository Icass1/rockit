"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    openPublicMediaLink,
    parsePublicMediaTimestamp,
} from "@/lib/services/publicSharing";

export default function SharedMediaLink(): null {
    const params = useSearchParams();
    const publicId = params.get("media");
    const timestamp = parsePublicMediaTimestamp(params.get("t"));
    useEffect(() => {
        if (!publicId) return;
        let active = true;
        void openPublicMediaLink(publicId, () => active, timestamp);
        return () => {
            active = false;
        };
    }, [publicId, timestamp]);
    return null;
}
