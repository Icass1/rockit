
import { RockItSong } from "@/types/rockIt";

import * as z from "zod";

export const HomeStats = z.object({
    songsByTimePlayed: z.array(RockItSong),
    randomSongsLastMonth: z.array(RockItSong),
    nostalgicMix: z.array(RockItSong),
    hiddenGems: z.array(RockItSong),
    communityTop: z.array(RockItSong),
    monthlyTop: z.array(RockItSong),
    moodSongs: z.array(RockItSong),
});
