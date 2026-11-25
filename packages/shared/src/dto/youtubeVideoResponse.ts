// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { YoutubeChannelResponseSchema } from "./youtubeChannelResponse";

export const YoutubeVideoResponseSchema = z.object({
    type: z.union([z.literal("video")]).default("video"),
    genre: z.string().nullable().default(null),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    videoUrl: z.string().nullable().default(null),
    audioUrl: z.string().nullable().default(null),
    imageUrl: z.string(),
    dominantColor: z.string(),
    duration_ms: z.number().nullable(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    downloaded: z.boolean(),
    youtubeId: z.string(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    channel: z
        .lazy(() => YoutubeChannelResponseSchema)
        .nullable()
        .default(null),
    description: z.string().nullable().default(null),
    youtubeUrl: z.string().nullable().default(null),
    tags: z.array(z.string()).default([]),
    publishedAt: z.string().nullable().default(null),
    video_path: z.string().nullable().default(null),
});

export type YoutubeVideoResponse = z.infer<typeof YoutubeVideoResponseSchema>;
