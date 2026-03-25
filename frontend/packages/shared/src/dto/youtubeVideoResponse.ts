import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { YoutubeChannelResponseSchema } from "./youtubeChannelResponse";

export const YoutubeVideoResponseSchema = z.object({
    type: z.union([z.literal("video")]).default("video"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    videoSrc: z.string().nullable(),
    audioSrc: z.string().nullable(),
    imageUrl: z.string(),
    duration_ms: z.number().nullable(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    downloaded: z.boolean(),
    youtubeId: z.string(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    channel: z.lazy(() => YoutubeChannelResponseSchema).nullable(),
    description: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.string().nullable(),
    video_path: z.string().nullable(),
    audio_path: z.string().nullable(),
});

export type YoutubeVideoResponse = z.infer<typeof YoutubeVideoResponseSchema>;
