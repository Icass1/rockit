"use client";

import { useState, type JSX } from "react";
import Image from "next/image";

export default function ReleaseArtwork({
    imageUrl,
    title,
}: {
    imageUrl: string;
    title: string;
}): JSX.Element {
    const [failed, setFailed] = useState(false);
    return (
        <span className="artist-release-art" aria-hidden>
            {imageUrl && !failed ? (
                <Image
                    src={imageUrl}
                    alt=""
                    width={250}
                    height={250}
                    sizes="(max-width: 720px) 45vw, 220px"
                    loading="lazy"
                    unoptimized
                    onError={() => setFailed(true)}
                />
            ) : (
                <span className="artist-release-initial">
                    {title.slice(0, 1)}
                </span>
            )}
        </span>
    );
}
