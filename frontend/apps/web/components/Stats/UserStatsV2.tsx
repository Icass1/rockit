"use client";

import { useCallback, type JSX } from "react";
import type { StatsRankedItemResponse, UserStatsV2Response } from "@/dto";
import { useStore } from "@nanostores/react";
import { isQueueable } from "@rockit/packages/shared/models/types/media";
import type { TPlayableMedia } from "@rockit/packages/shared/models/types/media";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ListeningHeatmap from "@/components/Stats/Charts/ListeningHeatmap";
import MinutesBarChart from "@/components/Stats/Charts/MinutesBarChart";
import RankingList from "@/components/Stats/RankingList";
import StatsSection from "@/components/Stats/StatsSection";
import SummaryCardsV2 from "@/components/Stats/SummaryCardsV2";

interface UserStatsV2Props {
    data: UserStatsV2Response;
    range: string;
    rangeLabel: string;
}

export default function UserStatsV2({
    data,
    range,
    rangeLabel,
}: UserStatsV2Props): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handlePlayMedia = useCallback(
        async (item: StatsRankedItemResponse): Promise<void> => {
            const listKey = `stats-${item.publicId}`;
            const allItems = data.topSongs.some(
                (s) => s.publicId === item.publicId
            )
                ? data.topSongs
                : data.topVideos;

            const results = await Promise.all(
                allItems.map((s) => Http.getMedia(s.publicId))
            );

            const playable = results
                .filter((r) => r.isOk())
                .map((r) => r.result.media)
                .filter((m) => isQueueable(m)) as TPlayableMedia[];

            if (playable.length === 0) return;

            rockIt.queueManager.setMedia(playable, listKey);
            rockIt.queueManager.moveToMedia(item.publicId);
            rockIt.mediaPlayerManager.play();
        },
        [data.topSongs, data.topVideos]
    );

    const handlePlaySong = useCallback(
        (item: StatsRankedItemResponse): void => {
            handlePlayMedia(item);
        },
        [handlePlayMedia]
    );

    const handlePlayVideo = useCallback(
        (item: StatsRankedItemResponse): void => {
            handlePlayMedia(item);
        },
        [handlePlayMedia]
    );

    return (
        <div className="flex flex-col gap-21 md:gap-30">
            <SummaryCardsV2 summary={data.summary} />

            <StatsSection
                title={`${$vocabulary.MINUTES_LISTEND} — ${rangeLabel}`}
                stagger={1}
            >
                <MinutesBarChart data={data.minutes} range={range} />
            </StatsSection>

            <div className="flex flex-col gap-8 md:gap-10">
                <div className="grid gap-8 md:grid-cols-2 md:gap-20">
                    <StatsSection title={$vocabulary.TOP_SONGS} stagger={2}>
                        <RankingList
                            items={data.topSongs}
                            showImages
                            onPlay={handlePlaySong}
                        />
                    </StatsSection>

                    <StatsSection
                        title={$vocabulary.MOST_LISTENED_ARTISTS}
                        stagger={3}
                    >
                        <RankingList items={data.topArtists} showImages />
                    </StatsSection>
                </div>

                <div className="grid gap-8 md:grid-cols-2 md:gap-20">
                    <StatsSection title={$vocabulary.TOP_VIDEOS} stagger={4}>
                        <RankingList
                            items={data.topVideos}
                            showImages
                            onPlay={handlePlayVideo}
                        />
                    </StatsSection>

                    <StatsSection title={$vocabulary.TOP_ALBUMS} stagger={5}>
                        <RankingList items={data.topAlbums} showImages />
                    </StatsSection>
                </div>
            </div>

            <StatsSection
                title={$vocabulary.MINUTES_LISTENED_PER_DAY}
                stagger={6}
            >
                <ListeningHeatmap data={data.heatmap} />
            </StatsSection>
        </div>
    );
}
