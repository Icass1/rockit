"use client";

import { JSX } from "react";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";
import {
    artistPageUrl,
    getArtistPortrait,
    rememberArtistPortrait,
} from "@/lib/services/artistService";

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
            {artists.map((artist, index): JSX.Element => (
                <div
                    key={artist.publicId}
                    className="flex min-w-0 flex-nowrap overflow-hidden"
                >
                    {linkable ? (
                        <Link
                            data-artist-link
                            href={artistPageUrl(artist.name)}
                            onClick={(event): void => {
                                event.stopPropagation();
                                if (!getArtistPortrait(artist.name))
                                    rememberArtistPortrait(
                                        artist.name,
                                        artist.imageUrl
                                    );
                            }}
                            onTouchStart={(event): void =>
                                event.stopPropagation()
                            }
                            onPointerDown={(event): void =>
                                event.stopPropagation()
                            }
                            onContextMenu={(event): void =>
                                event.stopPropagation()
                            }
                            className="truncate hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-white"
                        >
                            {artist.name}
                        </Link>
                    ) : (
                        <span className="truncate">{artist.name}</span>
                    )}
                    {index !== artists.length - 1 && <span>,</span>}
                </div>
            ))}
        </div>
    );
}
