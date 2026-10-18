import { BaseSongWithAlbumResponse, HomeStatsResponse } from "@/dto";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";

export interface HomeData {
    songsByTimePlayed: BaseSongWithAlbumResponse[];
    randomSongsLastMonth: BaseSongWithAlbumResponse[];
    nostalgicMix: BaseSongWithAlbumResponse[];
    hiddenGems: BaseSongWithAlbumResponse[];
    communityTop: BaseSongWithAlbumResponse[];
    monthlyTop: BaseSongWithAlbumResponse[];
    moodSongs: BaseSongWithAlbumResponse[];
    currentStreak: number;
    minutesListenedThisWeek: number;
    isEmpty: boolean;
}

function transformStats(dataResponse: HomeStatsResponse): HomeData {
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
    if (!dataResponse) return null;
    return transformStats(dataResponse);
}
