import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import {
    BaseAlbumWithSongsResponse,
    BaseSongWithoutAlbumResponse,
    EMediaType,
} from "@rockit/shared";
import { getAlbumAsync } from "@/lib/services/mediaService";
import RenderListClient from "@/components/RenderList/RenderListClient";

const getAlbum = cache(
    async (
        publicId: string
    ): Promise<BaseAlbumWithSongsResponse | undefined> => {
        const album = await getAlbumAsync(publicId).catch(
            (): undefined => undefined
        );
        return album;
    }
);

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}): Promise<{ title?: undefined } | { title: string }> {
    const { publicId } = await params;

    const album = await getAlbum(publicId);

    if (!album) {
        return {};
    }

    return {
        title: album.name,
    };
}

export default async function AlbumPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}): Promise<JSX.Element> {
    const { publicId } = await params;

    const albumResponse = await getAlbum(publicId);

    if (!albumResponse) {
        console.error(`Album response is ${albumResponse}`);
        notFound();
    }

    const albumMedia = albumResponse.songs.map(
        (m): BaseSongWithoutAlbumResponse => m
    );

    return (
        <RenderListClient
            publicId={publicId}
            type={EMediaType.Album}
            title={albumResponse.name}
            artists={albumResponse.artists}
            media={albumMedia}
            image={albumResponse.imageUrl}
            showMediaImage={false}
            showMediaIndex
        />
    );
}
