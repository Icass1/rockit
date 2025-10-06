import * as z from "zod";
import { RockItExternalImageResponse } from "./rockItExternalImageResponse";

export const RockItArtistResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    genres: z.array(z.string()),
    externalImages: z.array(RockItExternalImageResponse),
});
