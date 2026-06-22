"use client";

import { JSX, useEffect, useRef } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";

const TARGET_SPEED = 0.75;
const ACCEL = TARGET_SPEED / 120; // 2s to full speed at 60fps
const DECEL = ACCEL;

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
    const rotationRef = useRef(0);
    const speedRef = useRef(0);
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    useEffect(() => {
        let rafId: number;

        const animate = () => {
            const playing = isPlayingRef.current;

            if (playing) {
                speedRef.current = Math.min(
                    speedRef.current + ACCEL,
                    TARGET_SPEED
                );
            } else {
                speedRef.current = Math.max(
                    speedRef.current - DECEL,
                    0
                );
            }

            if (speedRef.current > 0) {
                rotationRef.current =
                    (rotationRef.current + speedRef.current) % 360;
                if (discRef.current) {
                    discRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
                }
            }

            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(rafId);
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
                    fill="rgba(255,255,255,0.45)"
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
