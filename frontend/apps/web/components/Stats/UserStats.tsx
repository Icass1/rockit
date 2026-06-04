"use client";

import { JSX } from "react";
import type { UserStatsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import StatsSection from "./StatsSection";
import SummaryCards from "./SummaryCards";
import RankingList from "./RankingList";
import MinutesBarChart from "./Charts/MinutesBarChart";
import ListeningHeatmap from "./Charts/ListeningHeatmap";

interface UserStatsProps {
    data: UserStatsResponse;
    rangeLabel: string;
}

export default function UserStats({
    data,
    rangeLabel,
}: UserStatsProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const topSongImage =
        data.topSongs.length > 0 ? data.topSongs[0].imageUrl : undefined;
    const topAlbumImage =
        data.topAlbums.length > 0 ? data.topAlbums[0].imageUrl : undefined;

    return (
        <div className="flex flex-col gap-12 md:gap-16">
            <SummaryCards summary={data.summary} />

            <StatsSection
                title={`${$vocabulary.MINUTES_LISTEND ?? "Minutes Listened"} — ${rangeLabel}`}
            >
                <MinutesBarChart data={data.minutes} />
            </StatsSection>

            <div className="grid gap-12 md:grid-cols-2 md:gap-8">
                <StatsSection
                    title={$vocabulary.TOP_SONGS ?? "Top Songs"}
                    backgroundImage={topSongImage ?? undefined}
                >
                    <RankingList
                        items={data.topSongs}
                        showImages
                        maxItems={5}
                    />
                </StatsSection>

                <StatsSection
                    title={$vocabulary.MOST_LISTENED_ARTISTS ?? "Top Artists"}
                >
                    <RankingList
                        items={data.topArtists}
                        showImages
                        maxItems={5}
                    />
                </StatsSection>
            </div>

            <div className="grid gap-12 md:grid-cols-2 md:gap-8">
                <StatsSection
                    title={$vocabulary.TOP_VIDEOS ?? "Top Videos"}
                >
                    <RankingList
                        items={data.topVideos}
                        showImages
                        maxItems={5}
                    />
                </StatsSection>

                <StatsSection
                    title={$vocabulary.TOP_ALBUMS ?? "Top Albums"}
                    backgroundImage={topAlbumImage ?? undefined}
                >
                    <RankingList
                        items={data.topAlbums}
                        showImages
                        maxItems={5}
                    />
                </StatsSection>
            </div>

            <StatsSection
                title={
                    $vocabulary.MINUTES_LISTENED_PER_DAY ??
                    "Listening Heatmap"
                }
            >
                <ListeningHeatmap data={data.heatmap} />
            </StatsSection>
        </div>
    );
}
