import { cache } from "react";
import { notFound } from "next/navigation";
import { getPlaylistAsync } from "@/lib/services/mediaService";
import RenderList from "@/components/RenderList/RenderList";

const getPlaylist = cache(async (publicId: string) => {
    const playlist = await getPlaylistAsync(publicId).catch(() => null);
    return playlist;
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlist = await getPlaylist(publicId);

    if (!playlist) {
        return {};
    }

    return {
        title: playlist.name,
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const playlistResponse = await getPlaylist(publicId);

    if (!playlistResponse) {
        console.error(`Playlist response is ${playlistResponse}`);
        notFound();
    }

    return (
        <RenderList
            title={playlistResponse.name}
            artists={[]}
            media={playlistResponse.medias}
            image={playlistResponse.imageUrl}
            imageBlur="http://localhost:8000/media/image/blur/9w4UGBJx10VtAg8IlbZcMRH3C2fLmeyT?q=3"
            showMediaImage={false}
            showMediaIndex
        />
    );
}
