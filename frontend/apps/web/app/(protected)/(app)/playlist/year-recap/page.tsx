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
        return getFeaturedListAsync("year-recap").catch(
            (): undefined => undefined
        );
    }
);

const lastYear = new Date().getFullYear() - 1;
const yearDigits = String(lastYear).split("");

export async function generateMetadata(): Promise<{ title: string }> {
    const playlist = await getFeatured();
    return {
        title: playlist?.name ?? `${lastYear} Recap`,
    };
}

export default async function YearRecapPage(): Promise<JSX.Element> {
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
            publicId="year-recap"
            type={EMediaType.Playlist}
            title={playlistResponse.name}
            artists={[playlistResponse.owner]}
            media={playlistMedia}
            image={playlistResponse.imageUrl}
            showMediaImage
            showMediaIndex={false}
            expandedByMediaId={expandedByMediaId}
            coverOverlay={
                <div
                    className="flex items-center justify-center gap-1 leading-none text-white"
                    style={{
                        fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
                        fontWeight: 900,
                        fontSize: "clamp(2rem, 8vw, 4rem)",
                        letterSpacing: "-0.04em",
                    }}
                >
                    {yearDigits.map((digit, i) => (
                        <span key={i}>{digit}</span>
                    ))}
                </div>
            }
        />
    );
}
