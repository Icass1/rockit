import { HomeStatsResponseSchema } from "@/dto";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { SongWithoutAlbum } from "@/lib/rockit/songWithoutAlbum";
import useFetch from "@/hooks/useFetch";

export interface HomeData {
    songsByTimePlayed: SongWithoutAlbum[];
    randomSongsLastMonth: SongWithAlbum[];
    hiddenGems: SongWithoutAlbum[];
    communityTop: SongWithoutAlbum[];
    monthlyTop: SongWithoutAlbum[];
    isEmpty: boolean;
}

function transformStats(
    dataResponse: NonNullable<ReturnType<typeof HomeStatsResponseSchema.parse>>
): HomeData {
    const songsByTimePlayed = dataResponse.songsByTimePlayed.map((song) =>
        SongWithAlbum.fromResponse(song).toSongWithoutAlbum()
    );
    const randomSongsLastMonth = dataResponse.randomSongsLastMonth.map((song) =>
        SongWithAlbum.fromResponse(song)
    );
    const hiddenGems = dataResponse.hiddenGems.map((song) =>
        SongWithAlbum.fromResponse(song).toSongWithoutAlbum()
    );
    const communityTop = dataResponse.communityTop.map((song) =>
        SongWithAlbum.fromResponse(song).toSongWithoutAlbum()
    );
    const monthlyTop = dataResponse.monthlyTop.map((song) =>
        SongWithAlbum.fromResponse(song).toSongWithoutAlbum()
    );

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
