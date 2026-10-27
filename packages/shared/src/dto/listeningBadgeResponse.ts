// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningBadgeResponseSchema = z.object({
    key: z.string(),
    titleKey: z.string(),
    descriptionKey: z.string(),
    scope: z.union([
        z.literal("session"),
        z.literal("total"),
        z.literal("plays"),
        z.literal("discovery"),
        z.literal("streak"),
        z.literal("sharing"),
        z.literal("friends"),
        z.literal("videos"),
        z.literal("mixed"),
    ]),
    targetMinutes: z.number().default(0),
    target: z.number(),
    current: z.number().default(0),
    visualVariant: z.string(),
    tier: z.number(),
    earnedAt: z.iso.datetime().nullable(),
});

export type ListeningBadgeResponse = z.infer<
    typeof ListeningBadgeResponseSchema
>;
