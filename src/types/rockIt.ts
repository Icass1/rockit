import * as z from "zod";
import { RockItSongWithAlbumResponse } from "@/responses/rockItSongWithAlbumResponse";

export type DBListType = "album" | "playlist";
export type QueueListType =
    | "album"
    | "playlist"
    | "carousel"
    | "library"
    | "auto-list";

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

// #region: DynamicLyricsItem

export const DynamicLyricsItem = z.object({
    lyrics: z.string(),
    seconds: z.number(),
});

// #endregion

// #region: DownloadItem

export const DownloadItem = z.object({
    publicId: z.string(),
    downloadURL: z.string(),
    userId: z.string(),
    dateStarted: z.date(),
    dateEnded: z.date(),
    status: z.string(),
    fail: z.number(),
    success: z.number(),
});

export type DownloadItem = z.infer<typeof DownloadItem>;

// #endregion

// #region: DownloadInfo

export const DownloadInfo = z.object({
    completed: z.number(),
    message: z.string(),
    selected: z.boolean(),
    publicId: z.string(),
});

export type DownloadInfo = z.infer<typeof DownloadInfo>;

// #endregion
