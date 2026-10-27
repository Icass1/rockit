import type {
    BaseSongWithAlbumResponse,
    MediaResponse,
    SongListResponse,
} from "@/dto";

export interface HomeData {
    recommendations?: SongListResponse;
    recommendationsLoading: boolean;
    quickSelections: BaseSongWithAlbumResponse[];
    songsByTimePlayed: BaseSongWithAlbumResponse[];
    randomSongsLastMonth: BaseSongWithAlbumResponse[];
    nostalgicMix: BaseSongWithAlbumResponse[];
    hiddenGems: BaseSongWithAlbumResponse[];
    communityTop: BaseSongWithAlbumResponse[];
    monthlyTop: BaseSongWithAlbumResponse[];
    moodSongs: BaseSongWithAlbumResponse[];
    recentlyClickedMedia: MediaResponse["media"][];
    currentStreak: number;
    minutesListenedThisWeek: number;
    isEmpty: boolean;
}
