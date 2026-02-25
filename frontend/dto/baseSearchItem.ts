import { z } from 'zod';

export const BaseSearchItemSchema = z.object({
    type: z.union([z.literal("album"), z.literal("playlist"), z.literal("artist"), z.literal("track")]),
    title: z.string(),
    subTitle: z.string(),
    url: z.string(),
});

export type BaseSearchItem = z.infer<typeof BaseSearchItemSchema>;