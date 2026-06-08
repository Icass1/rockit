// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UploadVideoRequestSchema = z.object({
    title: z.string(),
    artistNames: z.array(z.string()),
    fileSize: z.number(),
});

export type UploadVideoRequest = z.infer<typeof UploadVideoRequestSchema>;
