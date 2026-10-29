// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NavigationPinResponseSchema = z.object({
    type: z.union([
        z.literal("artist"),
        z.literal("album"),
        z.literal("playlist"),
    ]),
    publicId: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    url: z.string(),
    builtinKey: z
        .union([
            z.literal("liked"),
            z.literal("most-listened"),
            z.literal("recent-mix"),
            z.literal("last-month"),
            z.literal("year-recap"),
        ])
        .nullable(),
});

export type NavigationPinResponse = z.infer<typeof NavigationPinResponseSchema>;
