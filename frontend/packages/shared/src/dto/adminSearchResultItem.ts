// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const AdminSearchResultItemSchema = z.object({
    internalId: z.number(),
    publicId: z.string().nullable(),
    name: z.string(),
    type: z.union([
        z.literal("artist"),
        z.literal("album"),
        z.literal("playlist"),
        z.literal("song"),
        z.literal("video"),
        z.literal("radio"),
    ]),
    provider: z.string(),
    imageUrl: z.string().nullable(),
    score: z.number(),
});

export type AdminSearchResultItem = z.infer<typeof AdminSearchResultItemSchema>;
