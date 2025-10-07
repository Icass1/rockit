import * as z from "zod";
import { RockItSongWithAlbumResponse } from "../rockItSongWithAlbumResponse";
import { RockItAlbumWithoutSongsResponse } from "../rockItAlbumWithoutSongsResponse";
import { RockItArtistResponse } from "../rockItArtistResponse";

export const UserStatsResponse = z.object({
    totalTimesPlayedSong: z.number(),
    totalSecondsListened: z.number(),
    minutesListenedByRange: z.array(
        z.object({
            minutes: z.number(),
            start: z.date(),
            end: z.date(),
        })
    ),
    songs: z.array(
        RockItSongWithAlbumResponse.extend({
            index: z.number(),
            timesPlayed: z.number(),
        })
    ),
    albums: z.array(
        RockItAlbumWithoutSongsResponse.extend({
            index: z.number(),
            timesPlayed: z.number(),
        })
    ),
    artists: z.array(
        RockItArtistResponse.extend({
            index: z.number(),
            timesPlayed: z.number(),
        })
    ),
});
export type UserStatsResponse = z.infer<typeof UserStatsResponse>;
