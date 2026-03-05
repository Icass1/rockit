import { z } from "zod";
import { YoutubeChannelResponseSchema } from "@/dto";

export const YoutubeVideoResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    youtubeId: z.string(),
    name: z.string(),
    duration: z.number(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    internalImageUrl: z.string().nullable(),
    channel: z.lazy(() => YoutubeChannelResponseSchema).nullable(),
    description: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tags: z.array(z.string()),
    publishedAt: z.string().nullable(),
    path: z.string().nullable(),
});

export type YoutubeVideoResponse = z.infer<typeof YoutubeVideoResponseSchema>;
