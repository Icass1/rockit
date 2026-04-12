// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StartDownloadRequestSchema = z.object({
    ids: z.array(z.string()),
    title: z.string(),
});

export type StartDownloadRequest = z.infer<typeof StartDownloadRequestSchema>;
