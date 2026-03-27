import { z } from "zod";

export const StatsRankedItemResponseSchema = z.object({
    publicId: z.string(),
    name: z.string(),
    href: z.string(),
    value: z.number(),
    imageUrl: z.string().nullable(),
    subtitle: z.string().nullable(),
});

export type StatsRankedItemResponse = z.infer<
    typeof StatsRankedItemResponseSchema
>;
