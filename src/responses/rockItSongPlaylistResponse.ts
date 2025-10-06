import * as z from "zod";
import { RockItSongWithAlbumResponse } from "./rockItSongWithAlbumResponse";

export const RockItSongPlaylistResponse = RockItSongWithAlbumResponse.extend({
    addedAt: z.date(),
});

export type RockItSongPlaylistResponse = z.infer<
    typeof RockItSongPlaylistResponse
>;
