

import * as z from "zod";
import { RockItSongWithoutAlbumResponse } from "../rockItSongWithoutAlbumResponse";

export const HomeStatsResponse = z.object({
    songsByTimePlayed: z.array(RockItSongWithoutAlbumResponse),
    randomSongsLastMonth: z.array(RockItSongWithoutAlbumResponse),
    nostalgicMix: z.array(RockItSongWithoutAlbumResponse),
    hiddenGems: z.array(RockItSongWithoutAlbumResponse),
    communityTop: z.array(RockItSongWithoutAlbumResponse),
    monthlyTop: z.array(RockItSongWithoutAlbumResponse),
    moodSongs: z.array(RockItSongWithoutAlbumResponse),
});
