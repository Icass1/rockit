import {
    BaseAlbumWithoutSongsResponseSchema,
    BaseArtistResponseSchema,
} from "@/dto";
import { z } from "zod";

export const SpotifyTrackResponseSchema = z.object({
    type: z.union([z.literal("song")]).default("song"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.string().nullable(),
    downloaded: z.boolean(),
    imageUrl: z.string(),
    duration: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    album: z.lazy(() => BaseAlbumWithoutSongsResponseSchema),
    spotifyId: z.string(),
});

export type SpotifyTrackResponse = z.infer<typeof SpotifyTrackResponseSchema>;
