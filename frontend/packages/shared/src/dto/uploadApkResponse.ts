// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UploadApkResponseSchema = z.object({
    message: z.union([z.literal("BUILD_UPLOAD_SUCCESS")]),
    publicId: z.string(),
    filename: z.string(),
});

export type UploadApkResponse = z.infer<typeof UploadApkResponseSchema>;
