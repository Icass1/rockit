"use client";

import { JSX } from "react";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";
import { artistPageUrl } from "@/lib/services/artistService";

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
            title={artists.map((artist) => artist.name).join(", ")}
            className={`flex flex-row flex-nowrap justify-start gap-1 ${className || ""}`}
        >
            {artists.map((artist, index): JSX.Element => (
                <div
                    key={artist.publicId || artist.name}
                    className="flex shrink-0 flex-nowrap"
                >
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
                            className="focus-visible:outline-foreground-strong truncate hover:underline focus-visible:underline focus-visible:outline-2"
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
