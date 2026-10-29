// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { DownloadBrowseGroupResponseSchema } from "./downloadBrowseGroupResponse";
import { DownloadTotalsResponseSchema } from "./downloadTotalsResponse";

export const DownloadBrowseResponseSchema = z.object({
    groups: z.array(z.lazy(() => DownloadBrowseGroupResponseSchema)),
    totals: z.lazy(() => DownloadTotalsResponseSchema),
    page: z.number(),
    hasMore: z.boolean(),
});

export type DownloadBrowseResponse = z.infer<
    typeof DownloadBrowseResponseSchema
>;
