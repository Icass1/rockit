// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StartChunkedUploadResponseSchema = z.object({
    uploadId: z.string(),
    chunkSize: z.number(),
    totalChunks: z.number(),
});

export type StartChunkedUploadResponse = z.infer<
    typeof StartChunkedUploadResponseSchema
>;
