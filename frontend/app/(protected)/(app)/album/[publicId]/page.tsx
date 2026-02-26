import { RenderAlbum } from "@/components/Album";
import { AppError } from "@/lib/errors/AppError";
import { rockIt } from "@/lib/rockit/rockIt";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const album = await rockIt.albumManager
        .getSpotifyAlbumAsync(publicId)
        .catch(() => null);

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

    const albumResponse = await rockIt.albumManager
        .getSpotifyAlbumAsync(publicId)
        .catch(() => null);

    if (!albumResponse) throw new AppError(404);

    const albumWithSongs = {
        ...albumResponse,
        externalImages: [],
    };

    return <RenderAlbum albumResponse={albumWithSongs as unknown as Parameters<typeof RenderAlbum>[0]["albumResponse"]} />;
}
