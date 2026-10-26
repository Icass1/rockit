import {
    BaseSongWithAlbumResponse,
    HomeStatsResponseSchema,
    MediaResponse,
    mixHomeRecommendations,
    MediaResponse,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import useFetch from "@/lib/useFetch";

const fetchLocalRecommendations = () =>
    Http.getRecommendationsForYou(20, false);

export interface HomeData {
    songsByTimePlayed: BaseSongWithAlbumResponse[];
    randomSongsLastMonth: BaseSongWithAlbumResponse[];
    hiddenGems: BaseSongWithAlbumResponse[];
    communityTop: BaseSongWithAlbumResponse[];
    monthlyTop: BaseSongWithAlbumResponse[];
    recentlyClickedMedia: MediaResponse["media"][];
    isEmpty: boolean;
}

function transformStats(
    dataResponse: ReturnType<typeof HomeStatsResponseSchema.parse>
): HomeData {
    const songsByTimePlayed = dataResponse.songsByTimePlayed.map(
        (song) => song
    );
    const randomSongsLastMonth = dataResponse.randomSongsLastMonth.map(
        (song) => song
    );
    const hiddenGems = dataResponse.hiddenGems.map((song) => song);
    const communityTop = dataResponse.communityTop.map((song) => song);
    const monthlyTop = dataResponse.monthlyTop.map((song) => song);
    const recentlyClickedMedia = dataResponse.recentlyClickedMedia.map(
        (item) => item.media
    );

    const isEmpty =
        songsByTimePlayed.length === 0 &&
        randomSongsLastMonth.length === 0 &&
        hiddenGems.length === 0 &&
        communityTop.length === 0 &&
        monthlyTop.length === 0 &&
        recentlyClickedMedia.length === 0;

    return {
        songsByTimePlayed,
        randomSongsLastMonth,
        hiddenGems,
        communityTop,
        monthlyTop,
        recentlyClickedMedia,
        isEmpty,
    };
}

export function useHomeData() {
    const { data, loading, error } = useFetch(Http.getHomeStats);
    const { data: localRecommendations } = useFetch(fetchLocalRecommendations);
    const { data: externalRecommendations } = useFetch(
        Http.getRecommendationsForYou
    );
    const recommendations = externalRecommendations ?? localRecommendations;

    if (!data || loading || error) {
        return {
            data: null,
            loading,
            error,
        };
    }

    return {
        data: {
            ...transformStats(data),
            recommendations,
            quickSelections: mixHomeRecommendations(
                recommendations?.songs ?? [],
                data.randomSongsLastMonth
            ),
        },
        loading,
        error,
    };
}
