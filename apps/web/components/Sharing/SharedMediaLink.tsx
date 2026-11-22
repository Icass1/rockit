"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { openPublicMediaLink } from "@/lib/services/publicSharing";

export default function SharedMediaLink(): null {
    const params = useSearchParams();
    const publicId = params.get("media");
    useEffect(() => {
        if (!publicId) return;
        let active = true;
        void openPublicMediaLink(publicId, () => active);
        return () => {
            active = false;
        };
    }, [publicId]);
    return null;
}
