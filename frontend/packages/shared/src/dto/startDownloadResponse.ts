// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StartDownloadResponseSchema = z.object({
    downloadGroupId: z.string(),
});

export type StartDownloadResponse = z.infer<typeof StartDownloadResponseSchema>;
