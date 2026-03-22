import { z } from "zod";

const BaseArtistSchema = z.object({
    publicId: z.string(),
    name: z.string(),
});

export const BaseArtistResponseSchema = BaseArtistSchema;

export const BaseSongWithAlbumResponseSchema = z.object({
    type: z.literal("song").default("song"),
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
    album: z.any(),
});

export const BaseAlbumWithoutSongsResponseSchema = z.object({
    type: z.literal("album").default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
});

export const BasePlaylistResponseSchema = z.object({
    type: z.literal("playlist").default("playlist"),
    description: z.string().nullable(),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    medias: z.array(z.any()),
    contributors: z.array(z.any()),
    imageUrl: z.string(),
    owner: z.string(),
});

export const BaseVideoResponseSchema = z.object({
    type: z.literal("video").default("video"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export const BaseStationResponseSchema = z.object({
    type: z.literal("radio").default("radio"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export type BaseArtistResponse = z.infer<typeof BaseArtistResponseSchema>;
export type BaseSongWithAlbumResponse = z.infer<
    typeof BaseSongWithAlbumResponseSchema
>;
export type BaseAlbumWithoutSongsResponse = z.infer<
    typeof BaseAlbumWithoutSongsResponseSchema
>;
export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;
export type BaseVideoResponse = z.infer<typeof BaseVideoResponseSchema>;
export type BaseStationResponse = z.infer<typeof BaseStationResponseSchema>;
