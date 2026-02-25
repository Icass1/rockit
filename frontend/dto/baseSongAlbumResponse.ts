import { z } from "zod";
import { BaseArtistResponseSchema } from "@/dto";

export const BaseSongAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
});

export type BaseSongAlbumResponse = z.infer<typeof BaseSongAlbumResponseSchema>;
