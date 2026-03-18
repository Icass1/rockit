import { z } from "zod";
import { BaseArtistResponseSchema } from "@/dto";

export const BaseAlbumWithoutSongsResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
});

export type BaseAlbumWithoutSongsResponse = z.infer<
    typeof BaseAlbumWithoutSongsResponseSchema
>;
