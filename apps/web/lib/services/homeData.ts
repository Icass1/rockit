import type { HomeStatsResponse, SongListResponse } from "@/dto";
import { mixHomeRecommendations } from "@rockit/shared/lib/homeRecommendations";
import type { HomeData } from "@/models/interfaces/homeData";

/** Derive a serializable first-render model without browser state or I/O. */
export function buildHomeData(
    stats: HomeStatsResponse,
    recommendations?: SongListResponse
): HomeData {
    const recentlyClickedMedia = stats.recentlyClickedMedia.map(
        (entry) => entry.media
    );
    return {
        ...stats,
        recentlyClickedMedia,
        recommendations,
        recommendationsLoading: false,
        quickSelections: mixHomeRecommendations(
            recommendations?.songs ?? [],
            stats.randomSongsLastMonth
        ),
        isEmpty: [
            stats.songsByTimePlayed,
            stats.randomSongsLastMonth,
            stats.nostalgicMix,
            stats.hiddenGems,
            stats.communityTop,
            stats.monthlyTop,
            stats.moodSongs,
            recentlyClickedMedia,
        ].every((items) => items.length === 0),
    };
}
