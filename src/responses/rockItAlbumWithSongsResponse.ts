import * as z from "zod";
import { RockItSongWithoutAlbumResponse } from "./rockItSongWithoutAlbumResponse";
import { RockItAlbumWithoutSongsResponse } from "./rockItAlbumWithoutSongsResponse";

export const RockItAlbumWithSongsResponse =
    RockItAlbumWithoutSongsResponse.extend({
        songs: z.array(RockItSongWithoutAlbumResponse),
    });

export type RockItAlbumWithSongsResponse = z.infer<
    typeof RockItAlbumWithSongsResponse
>;
