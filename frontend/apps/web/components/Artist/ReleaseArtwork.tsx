"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ReleaseArtwork({
    imageUrl,
    title,
}: {
    imageUrl: string;
    title: string;
}): JSX.Element {
    const [failed, setFailed] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const source =
        imageUrl && !failed ? imageUrl : rockIt.ALBUM_PLACEHOLDER_IMAGE_URL;
    return (
        <span className="artist-release-art" aria-hidden>
            {!unavailable ? (
                <Image
                    src={source}
                    alt=""
                    width={250}
                    height={250}
                    sizes="(max-width: 720px) 45vw, 220px"
                    loading="lazy"
                    unoptimized
                    onError={() => {
                        if (imageUrl && !failed) setFailed(true);
                        else setUnavailable(true);
                    }}
                />
            ) : (
                <span className="artist-release-initial">
                    {title.slice(0, 1)}
                </span>
            )}
        </span>
    );
}
