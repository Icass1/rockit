// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StartChunkedUploadRequestSchema = z.object({
    fileName: z.string(),
    totalSize: z.number(),
    version: z.string(),
    description: z.string().nullable(),
});

export type StartChunkedUploadRequest = z.infer<
    typeof StartChunkedUploadRequestSchema
>;
