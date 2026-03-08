import { BaseArtistResponseSchema } from "@/dto";
import { z } from "zod";

export const BaseAlbumWithoutSongsResponseSchema = z.object({
    type: z.union([z.literal("album")]),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
});

export type BaseAlbumWithoutSongsResponse = z.infer<
    typeof BaseAlbumWithoutSongsResponseSchema
>;
