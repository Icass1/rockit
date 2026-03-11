import { z } from "zod";

export const PlaylistMediaResponseSchema = z.object({
    id: z.number(),
    position: z.number(),
    media_type: z.string(),
    media_id: z.string(),
    provider_id: z.number().nullable(),
});

export type PlaylistMediaResponse = z.infer<typeof PlaylistMediaResponseSchema>;
