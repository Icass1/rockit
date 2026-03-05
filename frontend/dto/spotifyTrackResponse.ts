import {
    BaseAlbumWithoutSongsResponseSchema,
    BaseArtistResponseSchema,
} from "@/dto";
import { z } from "zod";

export const SpotifyTrackResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.string().nullable(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    duration: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    album: z.lazy(() => BaseAlbumWithoutSongsResponseSchema),
    spotifyId: z.string(),
});

export type SpotifyTrackResponse = z.infer<typeof SpotifyTrackResponseSchema>;
