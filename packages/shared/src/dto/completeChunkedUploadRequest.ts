// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const CompleteChunkedUploadRequestSchema = z.object({
    uploadId: z.string(),
});

export type CompleteChunkedUploadRequest = z.infer<
    typeof CompleteChunkedUploadRequestSchema
>;
