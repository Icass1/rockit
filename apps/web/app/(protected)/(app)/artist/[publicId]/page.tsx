import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import { BaseArtistResponse } from "@rockit/shared";
import { getArtistAsync } from "@/lib/services/mediaService";
import ArtistClient from "@/components/Artist/ArtistClient";

const getArtist = cache(
    async (publicId: string): Promise<BaseArtistResponse | undefined> => {
        const artist = await getArtistAsync(publicId).catch(
            (): undefined => undefined
        );
        return artist;
    }
);

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}): Promise<{ title?: undefined } | { title: string }> {
    const { publicId } = await params;

    const artist = await getArtist(publicId);

    if (!artist) {
        return {};
    }

    return {
        title: artist.name,
    };
}

export default async function ArtistPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}): Promise<JSX.Element> {
    const { publicId } = await params;

    const artist = await getArtist(publicId);

    if (!artist) {
        console.error(`Artist response is ${artist}`);
        notFound();
    }

    return <ArtistClient artist={artist} />;
}
