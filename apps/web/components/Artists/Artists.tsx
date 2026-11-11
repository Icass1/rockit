"use client";

import { JSX } from "react";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";
import { artistPageUrl } from "@/lib/services/artistService";

export default function Artists({
    artists,
    className,
    linkable = true,
    multiline = false,
}: {
    artists: BaseArtistResponse[];
    className?: string;
    linkable?: boolean;
    multiline?: boolean;
}): JSX.Element {
    return (
        <div
            title={artists.map((artist) => artist.name).join(", ")}
            className={`max-w-full min-w-0 leading-normal ${multiline ? "line-clamp-5 text-center" : "truncate"} ${className || ""}`}
        >
            {artists.map((artist, index): JSX.Element => (
                <span key={artist.publicId || artist.name}>
                    {linkable ? (
                        <Link
                            data-artist-link
                            href={artistPageUrl(artist.name, artist.url)}
                            onClick={(event): void => {
                                event.stopPropagation();
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
                            className="focus-visible:outline-foreground-strong hover:underline focus-visible:underline focus-visible:outline-2"
                        >
                            {artist.name}
                        </Link>
                    ) : (
                        <span>{artist.name}</span>
                    )}
                    {index !== artists.length - 1 && <span>, </span>}
                </span>
            ))}
        </div>
    );
}
