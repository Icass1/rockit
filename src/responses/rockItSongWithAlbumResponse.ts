import * as z from "zod";
import { RockItAlbumWithoutSongsResponse } from "./rockItAlbumWithoutSongsResponse";
import { RockItSongWithoutAlbumResponse } from "./rockItSongWithoutAlbumResponse";

export const RockItSongWithAlbumResponse =
    RockItSongWithoutAlbumResponse.extend({
        album: RockItAlbumWithoutSongsResponse,
    });

export type RockItSongWithAlbumResponse = z.infer<
    typeof RockItSongWithAlbumResponse
>;
