// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { MediaResponseSchema } from "./mediaResponse";

export const ListenTogetherSessionResponseSchema = z.object({
    publicId: z.string(),
    hostPublicId: z.string(),
    hostUsername: z.string(),
    hostImageUrl: z.string().nullable().default(null),
    guestPublicId: z.string(),
    guestUsername: z.string(),
    guestImageUrl: z.string().nullable().default(null),
    currentMediaPublicId: z.string().nullable().default(null),
    currentMediaName: z.string().nullable().default(null),
    currentMediaImageUrl: z.string().nullable().default(null),
    currentTimeMs: z.number().default(0),
    isPlaying: z.boolean().default(false),
    updatedAt: z.iso.datetime(),
    currentMedia: z
        .lazy(() => MediaResponseSchema)
        .nullable()
        .default(null),
    status: z.union([
        z.literal("active"),
        z.literal("invited"),
        z.literal("ended"),
    ]),
});

export type ListenTogetherSessionResponse = z.infer<
    typeof ListenTogetherSessionResponseSchema
>;
