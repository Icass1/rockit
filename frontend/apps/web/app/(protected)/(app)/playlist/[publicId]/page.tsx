import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import {
    BasePlaylistWithMediasResponse,
    EMediaType,
    TMedia,
} from "@rockit/packages/shared";
import { getPlaylistAsync } from "@/lib/services/mediaService";
import RenderListClient from "@/components/RenderList/RenderListClient";

const getPlaylist = cache(
    async (
        publicId: string
    ): Promise<BasePlaylistWithMediasResponse | undefined> => {
        const playlist = await getPlaylistAsync(publicId).catch(
            (): undefined => undefined
        );
        return playlist;
    }
);

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

    return (
        <RenderListClient
            publicId={publicId}
            type={EMediaType.Playlist}
            title={playlistResponse.name}
            artists={[]}
            media={playlistMedia}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
        />
    );
}
