import * as z from "zod";
import { RockItSongWithAlbumResponse } from "@/responses/rockItSongWithAlbumResponse";

// #region: RockItQueueListSong

export const RockItQueueListSong = z.object({
    publicId: z.string(),
    type: z.string(),
});
export type RockItQueueListSong = z.infer<typeof RockItQueueListSong>;

// #endregion

// #region: RockItQueueSong

export const RockItQueueSong = z.object({
    index: z.number(),
    list: RockItQueueListSong,
    song: RockItSongWithAlbumResponse,
});
export type RockItQueueSong = z.infer<typeof RockItQueueSong>;

// #endregion


export const DynamicLyricsItem = z.object({
    lyrics: z.string(),
    seconds: z.number(),
});
