import * as z from "zod";
import { RockItExternalImageResponse } from "./rockItExternalImageResponse";

export const RockItPlaylistResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    externalImages: z.array(RockItExternalImageResponse),
    owner: z.string(),
    internalImageUrl: z.string().nullable(),
});

export type RockItPlaylistResponse = z.infer<typeof RockItPlaylistResponse>;
