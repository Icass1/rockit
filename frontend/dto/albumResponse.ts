import { z } from "zod";
import {
    BaseArtistResponseSchema,
    BaseSongResponseSchema,
    ExternalImageResponseSchema,
} from "@/dto";

export const AlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.array(z.lazy(() => BaseSongResponseSchema)),
    spotifyId: z.string(),
    externalImages: z.array(z.lazy(() => ExternalImageResponseSchema)),
});

export type AlbumResponse = z.infer<typeof AlbumResponseSchema>;
