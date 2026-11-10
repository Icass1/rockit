"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useArtworkCandidate } from "@rockit/ui/headless/useArtworkCandidate";
import { useRecommendationArtwork } from "@/components/providers/RecommendationArtworkProvider";

/** Resolve missing album artwork lazily; failures keep a bundled public asset. */
export default function RecommendationArtwork({
    src,
    alt = "",
    size,
    className,
    provider = "",
    artist = "",
    track = "",
}: {
    src: string;
    alt?: string;
    size: number;
    className: string;
    provider?: string;
    artist?: string;
    track?: string;
}): JSX.Element {
    const artwork = useRecommendationArtwork();
    const imageRef = useRef<HTMLImageElement>(null);
    const [visible, setVisible] = useState(false);
    const identity = JSON.stringify([provider, artist, track]);
    const candidate = useArtworkCandidate(
        artwork,
        src,
        provider,
        artist,
        track,
        visible
    );
    const image = candidate.uri ?? "/song-placeholder.png";

    useEffect(() => {
        const element = imageRef.current;
        if (!element) return;
        if (typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "100px" }
        );
        observer.observe(element);
        return (): void => observer.disconnect();
    }, [identity]);

    return (
        <Image
            ref={imageRef}
            src={image}
            alt={alt}
            width={size}
            height={size}
            onLoad={(): void => {
                if (typeof IntersectionObserver === "undefined")
                    setVisible(true);
            }}
            onError={(): void => candidate.reportFailure(image)}
            className={className}
        />
    );
}
