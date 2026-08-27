"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { Http } from "@/lib/http";
import useFetch from "@/hooks/useFetch";
import RecommendationsSection from "@/components/Recommendations/RecommendationsSection";

/** Personalized picks from /recommendation/for-you. Self-contained: fetches
 * its own data independently of useHomeData/HomeStatsResponse, so changing
 * the backend algorithm never touches this file. */
export default function ForYouSection(): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const { data } = useFetch(Http.getRecommendationsForYou);

    if (!data) return null;

    return (
        <RecommendationsSection
            title={$vocabulary.FOR_YOU}
            songs={data.songs}
            discover={data.discover}
        />
    );
}
