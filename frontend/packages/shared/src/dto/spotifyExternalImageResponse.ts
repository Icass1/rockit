import { z } from "zod";

export const SpotifyExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});

export type SpotifyExternalImageResponse = z.infer<
    typeof SpotifyExternalImageResponseSchema
>;
