"use client";

import { useCallback, type JSX } from "react";
import type { StatsRankedItemResponse, UserStatsV2Response } from "@/dto";
import { isQueueable } from "@rockit/shared/models/types/media";
import type { TPlayableMedia } from "@rockit/shared/models/types/media";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ListeningHeatmap from "@/components/Stats/Charts/ListeningHeatmap";
import MinutesBarChart from "@/components/Stats/Charts/MinutesBarChart";
import StatsInsights from "@/components/Stats/StatsInsights";
import SummaryCardsV2 from "@/components/Stats/SummaryCardsV2";
import TopMediaChart from "@/components/Stats/TopMediaChart";

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
    const $vocabulary = useVocabulary();

    const handlePlayMedia = useCallback(
        async (item: StatsRankedItemResponse): Promise<void> => {
            const listKey = `stats-${item.publicId}`;
            const allItems = data.topSongs.some(
                (s) => s.publicId === item.publicId
            )
                ? data.topSongs
                : data.topVideos;

            const results = await Promise.all(
                allItems.map((s) => Http.getMediaAsync(s.publicId))
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
        <div className="flex flex-col gap-8 md:gap-12">
            <SummaryCardsV2 summary={data.summary} rangeLabel={rangeLabel} />

            <div className="border-foreground-strong/7 bg-background/60 rounded-[2rem] border p-5 md:p-8">
                <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                            {$vocabulary.STATS_TIMELINE}
                        </p>
                        <h2 className="text-foreground-strong mt-1 text-2xl font-bold">
                            {$vocabulary.STATS_RHYTHM}
                        </h2>
                    </div>
                    <p className="text-subtle-foreground text-sm">
                        {rangeLabel}
                    </p>
                </div>
                <MinutesBarChart data={data.minutes} range={range} />
            </div>

            <StatsInsights insights={data.insights} />

            <div>
                <div className="mb-5">
                    <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                        {$vocabulary.STATS_LEADERBOARDS}
                    </p>
                    <h2 className="text-foreground-strong mt-1 text-2xl font-bold">
                        {$vocabulary.STATS_FAVORITES}
                    </h2>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                    <TopMediaChart
                        title={$vocabulary.TOP_SONGS}
                        items={data.topSongs}
                        onPlay={handlePlaySong}
                    />
                    <TopMediaChart
                        title={$vocabulary.MOST_LISTENED_ARTISTS}
                        items={data.topArtists}
                    />
                    <TopMediaChart
                        title={$vocabulary.TOP_ALBUMS}
                        items={data.topAlbums}
                    />
                    <TopMediaChart
                        title={$vocabulary.TOP_VIDEOS}
                        items={data.topVideos}
                        onPlay={handlePlayVideo}
                    />
                </div>
            </div>

            <section className="border-foreground-strong/7 bg-background/60 rounded-[2rem] border p-5 md:p-8">
                <div className="mb-8">
                    <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                        {$vocabulary.STATS_WEEKLY_PULSE}
                    </p>
                    <h2 className="text-foreground-strong mt-1 text-2xl font-bold">
                        {$vocabulary.STATS_PLAY_HOURS}
                    </h2>
                    <p className="text-subtle-foreground mt-2 text-sm">
                        {$vocabulary.STATS_HEATMAP_HELP}
                    </p>
                </div>
                <ListeningHeatmap data={data.heatmap} />
            </section>
        </div>
    );
}
