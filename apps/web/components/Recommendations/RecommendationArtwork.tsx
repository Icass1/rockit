"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";

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
    const imageRef = useRef<HTMLImageElement>(null);
    const [visible, setVisible] = useState(false);
    const [failedImages, setFailedImages] = useState<string[]>([]);
    const [resolvedImages, setResolvedImages] = useState<
        Record<string, string>
    >({});
    const source = src.trim();
    const identity = JSON.stringify([provider, artist, track]);
    const needsLookup = !source || failedImages.includes(source);
    const candidate = needsLookup ? resolvedImages[identity] : source;
    const image =
        candidate && !failedImages.includes(candidate)
            ? candidate
            : "/song-placeholder.png";

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

    useEffect(() => {
        if (!visible || !needsLookup || !provider || !artist || !track) return;
        let active = true;
        void rockIt.recommendationArtworkManager
            .resolveAsync(provider, artist, track)
            .then((url) => {
                if (active && url)
                    setResolvedImages((images) => ({
                        ...images,
                        [identity]: url,
                    }));
            });
        return (): void => {
            active = false;
        };
    }, [visible, needsLookup, provider, artist, track, identity]);

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
            onError={(): void =>
                setFailedImages((failed) =>
                    failed.includes(image) ? failed : [...failed, image]
                )
            }
            className={className}
        />
    );
}
