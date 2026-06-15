// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const BookmarkResponseSchema = z.object({
    publicId: z.string(),
    mediaPublicId: z.string(),
    timestamp: z.number(),
    description: z.string().nullable(),
    mode: z.enum(["NOTHING", "AUTOSKIP"]),
    dateAdded: z.iso.datetime(),
    dateUpdated: z.iso.datetime(),
});

export type BookmarkResponse = z.infer<typeof BookmarkResponseSchema>;
