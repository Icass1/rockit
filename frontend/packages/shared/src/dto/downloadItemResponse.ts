// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const DownloadItemResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    subtitle: z.string().nullable(),
    imageUrl: z.string().nullable(),
    completed: z.number(),
    message: z.string(),
    dateAdded: z.string().default(""),
});

export type DownloadItemResponse = z.infer<typeof DownloadItemResponseSchema>;
