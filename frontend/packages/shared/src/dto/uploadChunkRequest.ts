// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UploadChunkRequestSchema = z.object({
    uploadId: z.string(),
    chunkIndex: z.number(),
    chunkData: z.string(),
    chunkSize: z.number(),
    totalChunks: z.number(),
});

export type UploadChunkRequest = z.infer<typeof UploadChunkRequestSchema>;
