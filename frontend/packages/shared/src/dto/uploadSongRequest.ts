// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UploadSongRequestSchema = z.object({
    title: z.string(),
    artistNames: z.array(z.string()),
    fileSize: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
});

export type UploadSongRequest = z.infer<typeof UploadSongRequestSchema>;
