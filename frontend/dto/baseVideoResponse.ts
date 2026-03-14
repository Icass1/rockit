import { BaseArtistResponseSchema } from "@/dto";
import { z } from "zod";

export const BaseVideoResponseSchema = z.object({
    type: z.union([z.literal("video")]),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    videoSrc: z.string().nullable(),
    audioSrc: z.string().nullable(),
    imageUrl: z.string(),
    duration_ms: z.number(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
});

export type BaseVideoResponse = z.infer<typeof BaseVideoResponseSchema>;
