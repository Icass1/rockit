import { cache, JSX } from "react";
import { notFound } from "next/navigation";
import {
    BasePlaylistWithMediasResponse,
    EMediaType,
    TMedia,
} from "@rockit/packages/shared";
import { getFeaturedListAsync } from "@/lib/services/mediaService";
import RenderListClient from "@/components/RenderList/RenderListClient";

const getFeatured = cache(
    async (): Promise<BasePlaylistWithMediasResponse | undefined> => {
        return getFeaturedListAsync("last-month").catch(
            (): undefined => undefined
        );
    }
);

export async function generateMetadata(): Promise<{ title: string }> {
    const playlist = await getFeatured();
    return {
        title: playlist?.name ?? "Last Month Recap",
    };
}

export default async function LastMonthPage(): Promise<JSX.Element> {
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
            publicId="last-month"
            type={EMediaType.Playlist}
            title={playlistResponse.name}
            artists={[playlistResponse.owner]}
            media={playlistMedia}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
            expandedByMediaId={expandedByMediaId}
        />
    );
}
