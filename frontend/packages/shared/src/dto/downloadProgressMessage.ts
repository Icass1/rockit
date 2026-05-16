// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const DownloadProgressMessageSchema = z.object({
    type: z
        .union([z.literal("download_progress")])
        .default("download_progress"),
    publicId: z.string(),
    mediaPublicId: z.string(),
    name: z.string(),
    subtitle: z.string().nullable(),
    status: z.enum([
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
        "FETCHING",
        "WAITING_FOR_QUEUE_SETUP",
    ]),
    progress: z.number(),
    imageUrl: z.string().nullable(),
    dateStarted: z.iso.datetime(),
    dateEnded: z.iso.datetime().nullable(),
});

export type DownloadProgressMessage = z.infer<
    typeof DownloadProgressMessageSchema
>;
