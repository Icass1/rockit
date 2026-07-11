// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";

export const BaseVideoResponseSchema = z.object({
    type: z.union([z.literal("video")]).default("video"),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    videoUrl: z.string().nullable(),
    audioUrl: z.string().nullable(),
    imageUrl: z.string(),
    dominantColor: z.string(),
    duration_ms: z.number().nullable(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    downloaded: z.boolean(),
});

export type BaseVideoResponse = z.infer<typeof BaseVideoResponseSchema>;
