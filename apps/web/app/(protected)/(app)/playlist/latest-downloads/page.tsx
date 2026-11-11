import type { JSX } from "react";
import { EMediaType } from "@rockit/shared";
import { Download } from "lucide-react";
import { getFeaturedListAsync } from "@/lib/server/resources";
import { getRequestVocabulary } from "@/lib/server/vocabulary";
import RenderListClient from "@/components/RenderList/RenderListClient";

export async function generateMetadata(): Promise<{ title: string }> {
    const { vocabulary } = await getRequestVocabulary();
    return { title: vocabulary.FEATURED_LATEST_DOWNLOADS };
}

export default async function LatestDownloadsPage(): Promise<JSX.Element> {
    const [playlist, { vocabulary }] = await Promise.all([
        getFeaturedListAsync("latest-downloads"),
        getRequestVocabulary(),
    ]);
    return (
        <RenderListClient
            publicId={playlist.publicId}
            type={EMediaType.Playlist}
            title={vocabulary.FEATURED_LATEST_DOWNLOADS}
            artists={[playlist.owner]}
            media={playlist.medias.map((entry) => entry.item)}
            listMedia={playlist}
            image={playlist.imageUrl}
            showMediaImage
            showMediaIndex={false}
            expandedByMediaId={Object.fromEntries(
                playlist.medias.map((entry) => [
                    entry.item.publicId,
                    entry.expanded,
                ])
            )}
            coverOverlay={<Download className="h-1/2 w-1/2" aria-hidden />}
        />
    );
}
