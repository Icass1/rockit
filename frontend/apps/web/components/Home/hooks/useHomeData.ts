import { BaseSongWithAlbumResponse, HomeStatsResponseSchema } from "@/dto";
import useFetch from "@/hooks/useFetch";

export interface HomeData {
    songsByTimePlayed: BaseSongWithAlbumResponse[];
    randomSongsLastMonth: BaseSongWithAlbumResponse[];
    hiddenGems: BaseSongWithAlbumResponse[];
    communityTop: BaseSongWithAlbumResponse[];
    monthlyTop: BaseSongWithAlbumResponse[];
    isEmpty: boolean;
}

function transformStats(
    dataResponse: NonNullable<ReturnType<typeof HomeStatsResponseSchema.parse>>
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

    const isEmpty =
        songsByTimePlayed.length === 0 &&
        randomSongsLastMonth.length === 0 &&
        hiddenGems.length === 0 &&
        communityTop.length === 0 &&
        monthlyTop.length === 0;

    return {
        songsByTimePlayed,
        randomSongsLastMonth,
        hiddenGems,
        communityTop,
        monthlyTop,
        isEmpty,
    };
}

export function useHomeData(
    initialStats?: Awaited<
        ReturnType<typeof HomeStatsResponseSchema.parse>
    > | null
): HomeData | null {
    const [dataResponse] = useFetch("/stats/home", HomeStatsResponseSchema);

    const stats = dataResponse ?? initialStats;

    if (!stats) return null;

    return transformStats(stats);
}
