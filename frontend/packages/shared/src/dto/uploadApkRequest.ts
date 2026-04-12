// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UploadApkRequestSchema = z.object({
    version: z.string(),
    description: z.string().nullable(),
    fileContent: z.string(),
    fileName: z.string(),
});

export type UploadApkRequest = z.infer<typeof UploadApkRequestSchema>;
