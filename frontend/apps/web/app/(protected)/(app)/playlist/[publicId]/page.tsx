import { cache } from "react";
import { notFound } from "next/navigation";
import { getPlaylistAsync } from "@/lib/services/mediaService";
import RenderListClient from "@/components/RenderList/RenderListClient";

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

    const playlistMedia = playlistResponse.medias.map((m) => m.item);

    return (
        <RenderListClient
            playlistPublicId={publicId}
            title={playlistResponse.name}
            artists={[]}
            media={playlistMedia}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
        />
    );
}
