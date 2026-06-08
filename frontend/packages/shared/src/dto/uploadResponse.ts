// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UploadResponseSchema = z.object({
    publicId: z.string(),
    message: z.string(),
    filename: z.string().nullable(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;
