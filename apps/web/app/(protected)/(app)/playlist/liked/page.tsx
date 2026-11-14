import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import {
    BasePlaylistWithMediasResponse,
    EMediaType,
    TMedia,
} from "@rockit/shared";
import { Heart } from "lucide-react";
import { getFeaturedListAsync } from "@/lib/server/resources";
import { getRequestVocabulary } from "@/lib/server/vocabulary";
import RenderListClient from "@/components/RenderList/RenderListClient";

const getFeatured = cache(
    async (): Promise<BasePlaylistWithMediasResponse | undefined> => {
        return getFeaturedListAsync("liked");
    }
);

export async function generateMetadata(): Promise<{ title: string }> {
    const [playlist, { vocabulary }] = await Promise.all([
        getFeatured(),
        getRequestVocabulary(),
    ]);
    return {
        title: playlist?.name ?? vocabulary.LIKED_SONGS,
    };
}

export default async function LikedPage(): Promise<JSX.Element> {
    const playlistResponse = await getFeatured();

    if (!playlistResponse) {
        notFound();
    }

    const playlistMedia = playlistResponse.medias.map((m): TMedia => m.item);
    const expandedByMediaId: Record<string, boolean> = {};
    for (const m of playlistResponse.medias) {
        expandedByMediaId[m.item.publicId] = m.expanded;
    }

    return (
        <RenderListClient
            publicId="liked"
            type={EMediaType.Playlist}
            title={playlistResponse.name}
            artists={[playlistResponse.owner]}
            media={playlistMedia}
            listMedia={playlistResponse}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
            expandedByMediaId={expandedByMediaId}
            coverOverlay={<Heart className="h-1/2 w-1/2" fill="white" />}
        />
    );
}
