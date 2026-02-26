import { cache } from "react";
import { notFound } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import { RenderAlbum } from "@/components/Album";

const getAlbum = cache(async (publicId: string) => {
    const album = await rockIt.albumManager
        .getSpotifyAlbumAsync(publicId)
        .catch(() => null);
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

    const albumWithSongs = {
        ...albumResponse,
        externalImages: [],
    };

    return (
        <RenderAlbum
            albumResponse={
                albumWithSongs as unknown as Parameters<
                    typeof RenderAlbum
                >[0]["albumResponse"]
            }
        />
    );
}
