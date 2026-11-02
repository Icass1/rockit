"use client";

import { useState, type JSX } from "react";
import Image from "next/image";

/** A failed remote cover falls back once to a bundled, public asset. */
export default function RecommendationArtwork({
    src,
    alt = "",
    size,
    className,
}: {
    src: string;
    alt?: string;
    size: number;
    className: string;
}): JSX.Element {
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const source = src.trim();
    return (
        <Image
            src={
                !source || source === failedImage
                    ? "/song-placeholder.png"
                    : source
            }
            alt={alt}
            width={size}
            height={size}
            onError={(): void => setFailedImage(source)}
            className={className}
        />
    );
}
