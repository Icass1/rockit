import { JSX } from "react";
import { notFound } from "next/navigation";
import { EMediaType, TMedia } from "@rockit/shared";
import { getPlaylist } from "@/lib/server/resources";
import PlaylistRecommendations from "@/components/Playlist/PlaylistRecommendations";
import RenderListClient from "@/components/RenderList/RenderListClient";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}): Promise<{ title?: undefined } | { title: string }> {
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
}): Promise<JSX.Element> {
    const { publicId } = await params;

    const playlistResponse = await getPlaylist(publicId);

    if (!playlistResponse) {
        console.error(`Playlist response is ${playlistResponse}`);
        notFound();
    }

    const playlistMedia = playlistResponse.medias.map((m): TMedia => m.item);
    const expandedByMediaId: Record<string, boolean> = {};
    for (const m of playlistResponse.medias) {
        expandedByMediaId[m.item.publicId] = m.expanded;
    }

    return (
        <>
            <RenderListClient
                publicId={publicId}
                type={EMediaType.Playlist}
                title={playlistResponse.name}
                artists={[playlistResponse.owner]}
                media={playlistMedia}
                listMedia={playlistResponse}
                image={playlistResponse.imageUrl}
                showMediaImage
                showMediaIndex={false}
                expandedByMediaId={expandedByMediaId}
            />
            <PlaylistRecommendations publicId={publicId} />
        </>
    );
}
