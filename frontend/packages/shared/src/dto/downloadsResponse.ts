// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { DownloadGroupResponseSchema } from "./downloadGroupResponse";

export const DownloadsResponseSchema = z.object({
    downloads: z.array(z.lazy(() => DownloadGroupResponseSchema)),
});

export type DownloadsResponse = z.infer<typeof DownloadsResponseSchema>;
