// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningBadgeResponseSchema = z.object({
    key: z.string(),
    titleKey: z.string(),
    descriptionKey: z.string(),
    scope: z.union([z.literal("session"), z.literal("total")]),
    targetMinutes: z.number(),
    earnedAt: z.iso.datetime().nullable(),
});

export type ListeningBadgeResponse = z.infer<
    typeof ListeningBadgeResponseSchema
>;
