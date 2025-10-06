import * as z from "zod";
import { RockItArtistResponse } from "./rockItArtistResponse";

export const RockItSongWithoutAlbumResponse = z.object({
    publicId: z.string(),
    name: z.string(),
    artists: z.array(RockItArtistResponse),
    discNumber: z.number(),
    duration: z.number(),
    trackNumber: z.number(),
    internalImageUrl: z.string().nullable(),
    downloadUrl: z.string().nullable(),
    popularity: z.number().nullable(),
    dateAdded: z.string(),
    isrc: z.string(),
    downloaded: z.boolean(),
    audioUrl: z.string().nullable(),
});
export type RockItSongWithoutAlbumResponse = z.infer<
    typeof RockItSongWithoutAlbumResponse
>;
