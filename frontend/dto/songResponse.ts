import { z } from "zod";
import { BaseArtistResponseSchema, BaseSongAlbumResponseSchema } from "@/dto";

export const SongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    duration: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    album: z.lazy(() => BaseSongAlbumResponseSchema),
    spotifyId: z.string(),
});

export type SongResponse = z.infer<typeof SongResponseSchema>;
