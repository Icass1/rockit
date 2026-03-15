import { z } from "zod";

export const BaseStationResponseSchema = z.object({
    type: z.union([z.literal("station")]).default("station"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
