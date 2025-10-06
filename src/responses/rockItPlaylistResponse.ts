import * as z from "zod";
import { RockItExternalImageResponse } from "./rockItExternalImageResponse";
import { RockItSongPlaylistResponse } from "./rockItSongPlaylistResponse";

export const RockItPlaylistResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    externalImages: z.array(RockItExternalImageResponse),
    owner: z.string(),
    internalImageUrl: z.string().nullable(),
    songs: z.array(RockItSongPlaylistResponse),
});

export type RockItPlaylistResponse = z.infer<typeof RockItPlaylistResponse>;
