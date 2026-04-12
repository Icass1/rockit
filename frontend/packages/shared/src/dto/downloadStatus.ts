// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const DownloadStatusSchema = z.union([
    z.literal("converting"),
    z.literal("completed"),
    z.literal("downloading"),
    z.literal("error"),
    z.literal("starting"),
]);

export type DownloadStatus = z.infer<typeof DownloadStatusSchema>;
