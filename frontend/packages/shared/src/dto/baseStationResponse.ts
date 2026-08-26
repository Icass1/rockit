// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const BaseStationResponseSchema = z.object({
    type: z.union([z.literal("station")]).default("station"),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    streamUrl: z.string().nullable(),
    country: z.string().nullable(),
    countryCode: z.string().nullable(),
    codec: z.string().nullable(),
    bitrate: z.number().nullable(),
    tags: z.string().nullable(),
    homepage: z.string().nullable(),
    geoLat: z.number().nullable(),
    geoLong: z.number().nullable(),
});

export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
