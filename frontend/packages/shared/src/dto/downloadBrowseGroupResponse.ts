// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { DownloadItemResponseSchema } from "./downloadItemResponse";

export const DownloadBrowseGroupResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    dateStarted: z.iso.datetime(),
    dateEnded: z.iso.datetime().nullable(),
    success: z.number(),
    fail: z.number(),
    items: z.array(z.lazy(() => DownloadItemResponseSchema)),
    sourcePublicId: z.string().nullable(),
    total: z.number(),
    active: z.number(),
    matching: z.number(),
    imageUrl: z.string().nullable(),
    sourceType: z.string().nullable(),
    provider: z.string().default(""),
    providerUrl: z.string().default(""),
    sourceUrl: z.string().default(""),
    inLibrary: z.boolean().default(false),
    hasMoreItems: z.boolean().default(false),
    canManage: z.boolean().default(false),
});

export type DownloadBrowseGroupResponse = z.infer<
    typeof DownloadBrowseGroupResponseSchema
>;
