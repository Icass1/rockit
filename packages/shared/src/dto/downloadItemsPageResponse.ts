// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { DownloadItemResponseSchema } from "./downloadItemResponse";

export const DownloadItemsPageResponseSchema = z.object({
    items: z.array(z.lazy(() => DownloadItemResponseSchema)),
    offset: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
});

export type DownloadItemsPageResponse = z.infer<
    typeof DownloadItemsPageResponseSchema
>;
