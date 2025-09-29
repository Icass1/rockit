import RenderAlbum from "@/components/Album/RenderAlbum";
import { rockitIt } from "@/lib/rockit";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    return {};

    return {
        title: `${album.name} by ${album.artists[0].name}`,
        description: `Listen to ${album.name} by ${album.artists[0].name}`,
        openGraph: {
            title: `${album.name} by ${album.artists[0].name}`,
            description: `Listen to ${album.name} by ${album.artists[0].name}`,
            type: "music.album",
            url: `https://rockit.rockhosting.org/album/${id}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: album.image }),
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
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: album.image }),
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
    const { publicId } = await params; // No need for await here

    const album = await rockitIt.albumManager.getSpotifyAlbumAsync(publicId);

    return <RenderAlbum album={album}></RenderAlbum>;
}
