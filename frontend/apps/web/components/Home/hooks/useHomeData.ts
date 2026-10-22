import { BaseSongWithAlbumResponse, HomeStatsResponse } from "@/dto";
import type { SongListResponse } from "@/dto";
import { mixHomeRecommendations } from "@rockit/shared";
import type { HttpResult } from "@rockit/shared";
import type { HomeData } from "@/models/interfaces/homeData";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";

const fetchLocalRecommendations = (): Promise<HttpResult<SongListResponse>> =>
    Http.getRecommendationsForYou(20, false);

function transformStats(
    dataResponse: HomeStatsResponse
): Omit<
    HomeData,
    "recommendations" | "quickSelections" | "recommendationsLoading"
> {
    const songsByTimePlayed = dataResponse.songsByTimePlayed.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const randomSongsLastMonth = dataResponse.randomSongsLastMonth.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const nostalgicMix = dataResponse.nostalgicMix.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const hiddenGems = dataResponse.hiddenGems.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const communityTop = dataResponse.communityTop.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const monthlyTop = dataResponse.monthlyTop.map(
        (song): BaseSongWithAlbumResponse => song
    );
    const moodSongs = dataResponse.moodSongs.map(
        (song): BaseSongWithAlbumResponse => song
    );

    const isEmpty =
        songsByTimePlayed.length === 0 &&
        randomSongsLastMonth.length === 0 &&
        nostalgicMix.length === 0 &&
        hiddenGems.length === 0 &&
        communityTop.length === 0 &&
        monthlyTop.length === 0 &&
        moodSongs.length === 0;

    return {
        songsByTimePlayed,
        randomSongsLastMonth,
        nostalgicMix,
        hiddenGems,
        communityTop,
        monthlyTop,
        moodSongs,
        currentStreak: dataResponse.currentStreak,
        minutesListenedThisWeek: dataResponse.minutesListenedThisWeek,
        isEmpty,
    };
}

export function useHomeData(): HomeData | null {
    const { data: dataResponse } = useFetch(Http.getHomeStats);
    const { data: localRecommendations, loading: localLoading } = useFetch(
        fetchLocalRecommendations
    );
    const { data: externalRecommendations, loading: externalLoading } =
        useFetch(Http.getRecommendationsForYou);
    const recommendations = externalRecommendations ?? localRecommendations;
    if (!dataResponse) return null;
    return {
        ...transformStats(dataResponse),
        recommendations,
        recommendationsLoading: localLoading || externalLoading,
        quickSelections: mixHomeRecommendations(
            recommendations?.songs ?? [],
            dataResponse.randomSongsLastMonth
        ),
    };
}
