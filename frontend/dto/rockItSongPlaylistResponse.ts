import * as z from "zod";
import { RockItSongWithAlbumResponse } from "./rockItSongWithAlbumResponse";

export const RockItSongPlaylistResponse = z.object({
    addedAt: z.coerce.date(),
    song: RockItSongWithAlbumResponse,
    disabled: z.boolean(),
});

export type RockItSongPlaylistResponse = z.infer<
    typeof RockItSongPlaylistResponse
>;
