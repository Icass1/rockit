import { BaseSongAlbumResponseSchema } from "@/dto/baseSongAlbumResponse";
import { z } from "zod";

export const SongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    album: z.lazy(() => BaseSongAlbumResponseSchema),
    spotifyId: z.string(),
});

export type SongResponse = z.infer<typeof SongResponseSchema>;
