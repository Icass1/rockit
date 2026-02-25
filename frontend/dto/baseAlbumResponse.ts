import { z } from "zod";
import { BaseArtistResponseSchema, BaseSongResponseSchema } from "@/dto";

export const BaseAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.array(z.lazy(() => BaseSongResponseSchema)),
});

export type BaseAlbumResponse = z.infer<typeof BaseAlbumResponseSchema>;
