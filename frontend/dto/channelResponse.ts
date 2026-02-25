import { z } from 'zod';

export const ChannelResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string().nullable(),
    subscriberCount: z.number(),
    videoCount: z.number(),
    viewCount: z.number(),
    description: z.string().nullable(),
});

export type ChannelResponse = z.infer<typeof ChannelResponseSchema>;