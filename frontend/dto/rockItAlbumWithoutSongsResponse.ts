import * as z from "zod";
import { RockItCopyrightResponse } from "./rockItCopyrightResponse";
import { RockItExternalImageResponse } from "./rockItExternalImageResponse";
import { RockItArtistResponse } from "./rockItArtistResponse";

export const RockItAlbumWithoutSongsResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    copyrights: z.array(RockItCopyrightResponse),
    externalImages: z.array(RockItExternalImageResponse),
    artists: z.array(RockItArtistResponse),
    internalImageUrl: z.string().nullable(),
    releaseDate: z.string(),
});

export type RockItAlbumWithoutSongsResponse = z.infer<
    typeof RockItAlbumWithoutSongsResponse
>;
