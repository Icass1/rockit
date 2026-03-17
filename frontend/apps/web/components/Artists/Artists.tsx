"use client";

import Link from "next/link";
import { BaseArtistResponse } from "@/packages/dto";

export default function Artists({
    artists,
}: {
    artists: BaseArtistResponse[];
}) {
    return (
        <div className="flex flex-row flex-wrap justify-center gap-1">
            {artists.map((artist, index) => (
                <div key={artist.publicId} className="flex flex-nowrap">
                    <Link href={artist.url} className="hover:underline">
                        {artist.name}
                    </Link>
                    {index != artists.length - 1 && <span>,</span>}
                </div>
            ))}
        </div>
    );
}
