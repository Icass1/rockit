"use client";

import { useCallback, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { Http } from "@/lib/http";
import useFetch from "@/hooks/useFetch";
import RecommendationsSection from "@/components/Recommendations/RecommendationsSection";

/** Songs to add to this playlist, from /recommendation/playlist/{id}.
 * Self-contained: swapping the backend algorithm (co-occurrence today,
 * genre consensus or audio-feature centroid later) never touches this
 * file — same request, same response shape either way. */
export default function PlaylistRecommendations({
    publicId,
}: {
    publicId: string;
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const fetcher = useCallback(
        () => Http.getRecommendationsForPlaylist(publicId, 10),
        [publicId]
    );
    const { data } = useFetch(fetcher);

    if (!data) return null;

    return (
        <RecommendationsSection
            title={$vocabulary.RECOMMENDED_FOR_THIS_PLAYLIST}
            songs={data.songs}
            discover={data.discover}
        />
    );
}
