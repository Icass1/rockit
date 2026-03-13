import { z } from "zod";

export const BaseStationResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
