// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const BaseStationResponseSchema = z.object({
    type: z.union([z.literal("station")]).default("station"),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
