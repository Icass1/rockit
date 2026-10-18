// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StartUploadResponseSchema = z.object({
    uploadId: z.string(),
});

export type StartUploadResponse = z.infer<typeof StartUploadResponseSchema>;
