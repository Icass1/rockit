"use client";

import { JSX } from "react";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";

export default function Artists({
    artists,
    className,
}: {
    artists: BaseArtistResponse[];
    className?: string;
}): JSX.Element {
    return (
        <div
            className={`${className || ""} flex flex-row flex-wrap justify-center gap-1`}
        >
            {artists.map(
                (artist, index): JSX.Element => (
                    <div key={artist.publicId} className="flex flex-nowrap">
                        <Link
                            href={artist.url}
                            className="truncate hover:underline"
                        >
                            {artist.name}
                        </Link>
                        {index !== artists.length - 1 && <span>,</span>}
                    </div>
                )
            )}
        </div>
    );
}
