// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const AudioBoundsResponseSchema = z.object({
    status: z
        .union([
            z.literal("pending"),
            z.literal("ready"),
            z.literal("unavailable"),
        ])
        .default("unavailable"),
    start: z.number().default(0.0),
    end: z.number().nullable(),
    duration: z.number().nullable(),
    fingerprint: z.string().nullable(),
});

export type AudioBoundsResponse = z.infer<typeof AudioBoundsResponseSchema>;
