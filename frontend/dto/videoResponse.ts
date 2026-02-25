import { z } from "zod";
import { ChannelResponseSchema } from "./channelResponse";

export const VideoResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    youtubeId: z.string(),
    name: z.string(),
    duration: z.number(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    internalImageUrl: z.string().nullable(),
    channel: z.lazy(() => ChannelResponseSchema).nullable(),
    description: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tags: z.array(z.string()),
    publishedAt: z.string().nullable(),
});

export type VideoResponse = z.infer<typeof VideoResponseSchema>;
