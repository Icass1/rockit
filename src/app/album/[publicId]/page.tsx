import RenderAlbum from "@/components/Album/RenderAlbum";
import { rockIt } from "@/lib/rockit/rockIt";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const album = await rockIt.albumManager.getSpotifyAlbumAsync(publicId);

    return {
        title: `${album.name} by ${album.artists[0].name}`,
        description: `Listen to ${album.name} by ${album.artists[0].name}`,
        openGraph: {
            title: `${album.name} by ${album.artists[0].name}`,
            description: `Listen to ${album.name} by ${album.artists[0].name}`,
            type: "music.album",
            url: `https://rockit.rockhosting.org/album/${publicId}`,
            images: [
                {
                    url: album.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: album.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${album.name} by ${album.artists[0].name}`,
            description: `Listen to ${album.name} by ${album.artists[0].name}`,
            images: [
                {
                    url: album.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: album.name,
                },
            ],
        },
    };
}

export default async function AlbumPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const album = await rockIt.albumManager.getSpotifyAlbumAsync(publicId);

    return <RenderAlbum albumResponse={album}></RenderAlbum>;
}
