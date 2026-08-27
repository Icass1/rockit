// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const DownloadZipRequestSchema = z.object({
    ids: z.array(z.string()),
    title: z.string(),
});

export type DownloadZipRequest = z.infer<typeof DownloadZipRequestSchema>;
