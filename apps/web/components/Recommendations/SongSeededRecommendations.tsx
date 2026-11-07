"use client";

import { useCallback, type JSX } from "react";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import RecommendationsSection from "@/components/Recommendations/RecommendationsSection";

/** Recommendations seeded from a single song, for contexts that have no
 * recommendation endpoint of their own (an album, for instance). Renders
 * nothing until the request resolves, and nothing at all if it comes back
 * empty. */
export default function SongSeededRecommendations({
    seedSongPublicId,
}: {
    seedSongPublicId: string;
}): JSX.Element | null {
    const $vocabulary = useVocabulary();
    const fetcher = useCallback(
        () => Http.getRelatedSongs(seedSongPublicId, 10),
        [seedSongPublicId]
    );
    const { data } = useFetch(fetcher);

    if (!data) return null;

    return (
        <RecommendationsSection
            title={$vocabulary.RECOMMENDED_SONGS}
            songs={data.songs}
            discover={data.discover}
            discoverProvider={data.discoverProvider}
            discoverStatus={data.discoverStatus}
        />
    );
}
