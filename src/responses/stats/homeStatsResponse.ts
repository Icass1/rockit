
import { RockItSongWithoutAlbum } from "@/types/rockIt";

import * as z from "zod";

export const HomeStats = z.object({
    songsByTimePlayed: z.array(RockItSongWithoutAlbum),
    randomSongsLastMonth: z.array(RockItSongWithoutAlbum),
    nostalgicMix: z.array(RockItSongWithoutAlbum),
    hiddenGems: z.array(RockItSongWithoutAlbum),
    communityTop: z.array(RockItSongWithoutAlbum),
    monthlyTop: z.array(RockItSongWithoutAlbum),
    moodSongs: z.array(RockItSongWithoutAlbum),
});
