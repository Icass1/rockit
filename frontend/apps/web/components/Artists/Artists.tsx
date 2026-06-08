"use client";

import { JSX } from "react";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";

export default function Artists({
    artists,
    className,
    linkable = true,
}: {
    artists: BaseArtistResponse[];
    className?: string;
    linkable?: boolean;
}): JSX.Element {
    return (
        <div
            className={`flex flex-row flex-wrap justify-center gap-1 ${className || ""}`}
        >
            {artists.map(
                (artist, index): JSX.Element => (
                    <div
                        key={artist.publicId}
                        className="flex min-w-0 flex-nowrap overflow-hidden"
                    >
                        {linkable ? (
                            <Link
                                href={artist.url}
                                className="truncate hover:underline"
                            >
                                {artist.name}
                            </Link>
                        ) : (
                            <span className="truncate">{artist.name}</span>
                        )}
                        {index !== artists.length - 1 && <span>,</span>}
                    </div>
                )
            )}
        </div>
    );
}
