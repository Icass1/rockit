"use client";

import { JSX, useEffect, useRef } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { startVinylRotation } from "@/lib/utils/vinylRotation";

export default function VinylRecord({
    imageUrl,
    name,
    artists,
    isPlaying,
}: {
    imageUrl: string;
    name: string;
    artists: BaseArtistResponse[];
    isPlaying: boolean;
}): JSX.Element {
    const artistText = artists.map((a) => a.name).join(", ");
    const discRef = useRef<HTMLDivElement>(null);
    const isPlayingRef = useRef(isPlaying);

    // Keep ref in sync with prop outside of render
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        const disc = discRef.current;
        if (!disc) return;
        return startVinylRotation(disc, () => isPlayingRef.current);
    }, []);

    return (
        <div className="relative h-full w-full">
            <div ref={discRef} className="vinyl-disc">
                <div className="vinyl-cover-circle">
                    <Image
                        src={imageUrl}
                        fill
                        alt={name}
                        className="object-cover"
                        draggable={false}
                    />
                </div>
                <div className="vinyl-outer-ring" />
                <div className="vinyl-ring-white" />
                <div className="vinyl-black-center">
                    <div className="vinyl-black-dot" />
                </div>
            </div>
            <svg
                className="vinyl-text-svg z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <path id="vinyl-text-arc" d="M 4 50 A 46 46 0 0 1 96 50" />
                </defs>
                <text
                    className="fill-on-media/45"
                    fontSize="1.8"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    letterSpacing="1.2"
                >
                    <textPath
                        href="#vinyl-text-arc"
                        startOffset="50%"
                        textAnchor="middle"
                    >
                        {name.toUpperCase()} · {artistText.toUpperCase()}
                    </textPath>
                </text>
            </svg>
        </div>
    );
}
