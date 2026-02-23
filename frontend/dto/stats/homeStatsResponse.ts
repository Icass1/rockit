import * as z from "zod";
import { RockItSongWithAlbumResponse } from "@/dto/rockItSongWithAlbumResponse";

export const HomeStatsResponse = z.object({
    songsByTimePlayed: z.array(RockItSongWithAlbumResponse),
    randomSongsLastMonth: z.array(RockItSongWithAlbumResponse),
    nostalgicMix: z.array(RockItSongWithAlbumResponse),
    hiddenGems: z.array(RockItSongWithAlbumResponse),
    communityTop: z.array(RockItSongWithAlbumResponse),
    monthlyTop: z.array(RockItSongWithAlbumResponse),
    moodSongs: z.array(RockItSongWithAlbumResponse),
});
