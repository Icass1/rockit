import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import {
    BasePlaylistWithMediasResponse,
    EMediaType,
    TMedia,
} from "@rockit/packages/shared";
import { getFeaturedListAsync } from "@/lib/services/mediaService";
import RenderListClient from "@/components/RenderList/RenderListClient";

const getFeatured = cache(
    async (): Promise<BasePlaylistWithMediasResponse | undefined> => {
        return getFeaturedListAsync("recent-mix").catch(
            (): undefined => undefined
        );
    }
);

export async function generateMetadata(): Promise<{ title: string }> {
    const playlist = await getFeatured();
    return {
        title: playlist?.name ?? "Recent Mix",
    };
}

export default async function RecentMixPage(): Promise<JSX.Element> {
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
            publicId="recent-mix"
            type={EMediaType.Playlist}
            title={playlistResponse.name}
            artists={[playlistResponse.owner]}
            media={playlistMedia}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
            expandedByMediaId={expandedByMediaId}
            coverOverlay={
                <History className="h-1/2 w-1/2" />
            }
        />
    );
}
