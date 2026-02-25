import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";
import { RockItSongWithoutAlbum } from "@/lib/rockit/rockItSongWithoutAlbum";
import { HomeStatsResponse } from "@/dto/stats/homeStatsResponse";
import useFetch from "@/hooks/useFetch";

export interface HomeData {
    songsByTimePlayed: RockItSongWithoutAlbum[];
    randomSongsLastMonth: RockItSongWithAlbum[];
    hiddenGems: RockItSongWithoutAlbum[];
    communityTop: RockItSongWithoutAlbum[];
    monthlyTop: RockItSongWithoutAlbum[];
    isEmpty: boolean;
}

export function useHomeData(): HomeData | null {
    const [dataResponse] = useFetch("/stats/home", HomeStatsResponse);

    if (!dataResponse) return null;

    const songsByTimePlayed = dataResponse.songsByTimePlayed.map((song) =>
        RockItSongWithAlbum.fromResponse(song).toRockItSongWithoutAlbum()
    );
    const randomSongsLastMonth = dataResponse.randomSongsLastMonth.map((song) =>
        RockItSongWithAlbum.fromResponse(song)
    );
    const hiddenGems = dataResponse.hiddenGems.map((song) =>
        RockItSongWithAlbum.fromResponse(song).toRockItSongWithoutAlbum()
    );
    const communityTop = dataResponse.communityTop.map((song) =>
        RockItSongWithAlbum.fromResponse(song).toRockItSongWithoutAlbum()
    );
    const monthlyTop = dataResponse.monthlyTop.map((song) =>
        RockItSongWithAlbum.fromResponse(song).toRockItSongWithoutAlbum()
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
