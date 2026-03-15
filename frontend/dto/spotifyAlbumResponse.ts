import {
    BaseArtistResponseSchema,
    BaseSongWithoutAlbumResponseSchema,
    SpotifyExternalImageResponseSchema,
} from "@/dto";
import { z } from "zod";

export const SpotifyAlbumResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
    spotifyId: z.string(),
    externalImages: z.array(z.lazy(() => SpotifyExternalImageResponseSchema)),
});

export type SpotifyAlbumResponse = z.infer<typeof SpotifyAlbumResponseSchema>;
