import * as z from "zod";

export type DBListType = "album" | "playlist";
export type QueueListType =
    | "album"
    | "playlist"
    | "carousel"
    | "library"
    | "auto-list";

export const QueueListTypes: QueueListType[] = [
    "album",
    "playlist",
    "carousel",
    "library",
    "auto-list",
];

// #region: RockItQueueListSong

// #endregion

// #region: RockItQueueSong

// #endregion

// #region: DynamicLyricsItem

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
    status: z.string(),
});

export type DownloadInfo = z.infer<typeof DownloadInfo>;

// #endregion
