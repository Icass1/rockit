// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const BaseStationResponseSchema = z.object({
    type: z.union([z.literal("station")]).default("station"),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    streamUrl: z.string().nullable().default(null),
    country: z.string().nullable().default(null),
    countryCode: z.string().nullable().default(null),
    codec: z.string().nullable().default(null),
    bitrate: z.number().nullable().default(null),
    tags: z.string().nullable().default(null),
    homepage: z.string().nullable().default(null),
    geoLat: z.number().nullable().default(null),
    geoLong: z.number().nullable().default(null),
});

export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
