import { z } from "zod";
import { BaseArtistResponseSchema } from "@/dto";

export const BaseAlbumSongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
});

export type BaseAlbumSongResponse = z.infer<typeof BaseAlbumSongResponseSchema>;
