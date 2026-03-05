import { z } from "zod";

export const YoutubeChannelResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string().nullable(),
    subscriberCount: z.number(),
    videoCount: z.number(),
    viewCount: z.number(),
    description: z.string().nullable(),
});

export type YoutubeChannelResponse = z.infer<
    typeof YoutubeChannelResponseSchema
>;
