import "server-only";
import type { JSX } from "react";
import { ServerHttp } from "@/lib/api/server";
import { getRequestVocabulary } from "@/lib/server/vocabulary";
import RecommendationsSection from "@/components/Recommendations/RecommendationsSection";

/** Secondary provider work streams independently of the local Home feed. */
export default async function HomeDiscovery(): Promise<JSX.Element | null> {
    const response = await ServerHttp.getRecommendationsForYou(20, true);
    if (!response.isOk() || !response.result.discover.length) return null;
    const { vocabulary } = await getRequestVocabulary();
    return (
        <RecommendationsSection
            title={vocabulary.PLAYER_DISCOVER_TITLE}
            songs={[]}
            discover={response.result.discover}
            discoverProvider={response.result.discoverProvider}
            discoverStatus={response.result.discoverStatus}
        />
    );
}
