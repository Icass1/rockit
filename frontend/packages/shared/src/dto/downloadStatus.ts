import { z } from "zod";

export const DownloadStatusSchema = z.union([
    z.literal("converting"),
    z.literal("completed"),
    z.literal("downloading"),
    z.literal("error"),
    z.literal("starting"),
]);

export type DownloadStatus = z.infer<typeof DownloadStatusSchema>;
