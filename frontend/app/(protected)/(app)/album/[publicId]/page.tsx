import { cache } from "react";
import { notFound } from "next/navigation";
import { BaseSongWithAlbumResponse } from "@/dto";
import { getAlbumAsync } from "@/lib/services/mediaService";
import RenderList from "@/components/RenderList/RenderList";

const getAlbum = cache(async (publicId: string) => {
    const album = await getAlbumAsync(publicId).catch(() => null);
    return album;
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const album = await getAlbum(publicId);

    if (!album) return {};

    return {
        title: album.name,
        openGraph: {
            title: album.name,
            type: "music.album",
            images: [{ url: album.internalImageUrl, width: 600, height: 600 }],
        },
    };
}

export default async function AlbumPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const albumResponse = await getAlbum(publicId);

    if (!albumResponse) notFound();

    const songsWithAlbum: BaseSongWithAlbumResponse[] = albumResponse.songs.map(
        (song) => {
            return { ...song, album: { ...albumResponse, songs: [] } };
        }
    );

    songsWithAlbum.sort((a, b) => a.trackNumber - b.trackNumber);

    return (
        <RenderList
            title={albumResponse.name}
            artists={albumResponse.artists}
            media={songsWithAlbum}
            image={albumResponse.internalImageUrl}
            showMediaImage={false}
            showMediaIndex
        />
    );
}
