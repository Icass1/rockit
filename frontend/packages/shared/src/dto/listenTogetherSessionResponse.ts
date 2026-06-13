// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherSessionResponseSchema = z.object({
    publicId: z.string(),
    hostPublicId: z.string(),
    hostUsername: z.string(),
    hostImageUrl: z.string().nullable(),
    guestPublicId: z.string(),
    guestUsername: z.string(),
    guestImageUrl: z.string().nullable(),
    currentMediaPublicId: z.string().nullable(),
    currentMediaName: z.string().nullable(),
    currentMediaImageUrl: z.string().nullable(),
    currentTimeMs: z.number().default(0),
    isPlaying: z.boolean().default(false),
    status: z.string(),
});

export type ListenTogetherSessionResponse = z.infer<
    typeof ListenTogetherSessionResponseSchema
>;
