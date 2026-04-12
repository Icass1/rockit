// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UploadApkResponseSchema = z.object({
    message: z.string(),
    id: z.number(),
});

export type UploadApkResponse = z.infer<typeof UploadApkResponseSchema>;
