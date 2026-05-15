"use client";

import { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { BaseArtistResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export default function ArtistClient({
    artist,
}: {
    artist: BaseArtistResponse;
}): JSX.Element {
    return (
        <div className="flex h-full flex-col items-center overflow-y-auto p-6">
            <div className="flex w-full max-w-lg flex-col items-center gap-6">
                <div className="relative h-64 w-64 overflow-hidden rounded-full shadow-lg">
                    <Image
                        src={artist.imageUrl || rockIt.SONG_PLACEHOLDER_IMAGE_URL}
                        alt={artist.name}
                        fill
                        className="object-cover"
                    />
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-3xl font-bold">{artist.name}</h1>
                    <ProviderTag name={artist.provider} />
                </div>

                <div className="flex gap-4">
                    <Link
                        href={artist.providerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
                    >
                        Open in {artist.provider}
                    </Link>
                </div>
            </div>
        </div>
    );
}
