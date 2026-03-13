import { BaseArtistResponseSchema, YoutubeChannelResponseSchema } from "@/dto";
import { z } from "zod";

export const YoutubeVideoResponseSchema = z.object({
    type: z.union([z.literal("video")]),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    videoSrc: z.string().nullable(),
    audioSrc: z.string().nullable(),
    imageUrl: z.string(),
    duration: z.number(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    youtubeId: z.string(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    channel: z.lazy(() => YoutubeChannelResponseSchema).nullable(),
    description: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tags: z.array(z.string()),
    publishedAt: z.string().nullable(),
    path: z.string().nullable(),
});

export type YoutubeVideoResponse = z.infer<typeof YoutubeVideoResponseSchema>;
