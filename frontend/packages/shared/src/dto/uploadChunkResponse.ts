// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UploadChunkResponseSchema = z.object({
    uploadId: z.string(),
    chunkIndex: z.number(),
    chunksReceived: z.number(),
    totalChunks: z.number(),
});

export type UploadChunkResponse = z.infer<typeof UploadChunkResponseSchema>;
