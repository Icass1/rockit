// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const StatsRankedItemResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    href: z.string(),
    value: z.number(),
    imageUrl: z.string().nullable().default(null),
    subtitle: z.string().nullable().default(null),
});

export type StatsRankedItemResponse = z.infer<
    typeof StatsRankedItemResponseSchema
>;
