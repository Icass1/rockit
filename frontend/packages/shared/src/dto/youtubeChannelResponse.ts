// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const YoutubeChannelResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    subscriberCount: z.number().default(0),
    videoCount: z.number().default(0),
    viewCount: z.number().default(0),
    description: z.string().nullable(),
});

export type YoutubeChannelResponse = z.infer<
    typeof YoutubeChannelResponseSchema
>;
