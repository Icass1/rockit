import * as z from "zod";
import { RockItExternalImageResponse } from "./rockItExternalImageResponse";

export const RockItArtistResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    genres: z.array(z.string()),
    externalImages: z.array(RockItExternalImageResponse),
    internalImageUrl: z.string().nullable(),
});

export type RockItArtistResponse = z.infer<typeof RockItArtistResponse>;
