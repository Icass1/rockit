// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { DownloadItemResponseSchema } from "./downloadItemResponse";

export const DownloadGroupResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    dateStarted: z.iso.datetime(),
    dateEnded: z.iso.datetime().nullable(),
    success: z.number(),
    fail: z.number(),
    items: z.array(z.lazy(() => DownloadItemResponseSchema)),
});

export type DownloadGroupResponse = z.infer<typeof DownloadGroupResponseSchema>;
