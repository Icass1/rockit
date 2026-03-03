import { z } from "zod";

export const YouTubeSearchVideoItemSchema = z.object({
    videoId: z.string(),
    title: z.string(),
    channelTitle: z.string(),
    thumbnailUrl: z.string(),
});

export const YouTubeSearchResponseSchema = z.object({
    videos: z.array(YouTubeSearchVideoItemSchema),
});

export type YouTubeSearchVideoItem = z.infer<typeof YouTubeSearchVideoItemSchema>;
export type YouTubeSearchResponse = z.infer<typeof YouTubeSearchResponseSchema>;
