import { z } from 'zod';

export const BaseAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.any(),
});

export type BaseAlbumResponse = z.infer<typeof BaseAlbumResponseSchema>;

export const BasePlaylistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
});

export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;

export const LibraryListsResponseSchema = z.object({
    albums: z.array(BaseAlbumResponseSchema),
    playlists: z.array(BasePlaylistResponseSchema),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;

export const BaseSongAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
});

export type BaseSongAlbumResponse = z.infer<typeof BaseSongAlbumResponseSchema>;

export const LoginResponseSchema = z.object({
    userId: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const OkResponseSchema = z.object({
    status: z.string(),
});

export type OkResponse = z.infer<typeof OkResponseSchema>;

export const SessionResponseSchema = z.object({
    username: z.any(),
    image: z.any(),
    admin: z.boolean(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const BaseSearchItemSchema = z.object({
    type: z.union([z.literal("album"), z.literal("playlist"), z.literal("artist"), z.literal("track")]),
    title: z.string(),
    subTitle: z.string(),
    url: z.string(),
});

export type BaseSearchItem = z.infer<typeof BaseSearchItemSchema>;

export const ProviderSearchResponseSchema = z.object({
    provider: z.string(),
    items: z.array(BaseSearchItemSchema),
});

export type ProviderSearchResponse = z.infer<typeof ProviderSearchResponseSchema>;

export const BaseSongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    album: BaseSongAlbumResponseSchema,
});

export type BaseSongResponse = z.infer<typeof BaseSongResponseSchema>;

export const HomeStatsResponseSchema = z.object({
    songsByTimePlayed: z.array(BaseSongResponseSchema),
    randomSongsLastMonth: z.array(BaseSongResponseSchema),
    nostalgicMix: z.array(BaseSongResponseSchema),
    hiddenGems: z.array(BaseSongResponseSchema),
    communityTop: z.array(BaseSongResponseSchema),
    monthlyTop: z.array(BaseSongResponseSchema),
    moodSongs: z.array(BaseSongResponseSchema),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponseSchema>;

export const QueueResponseItemListSchema = z.object({
    publicId: z.string(),
});

export type QueueResponseItemList = z.infer<typeof QueueResponseItemListSchema>;

export const QueueResponseItemSchema = z.object({
    queueSongId: z.number(),
    list: QueueResponseItemListSchema,
});

export type QueueResponseItem = z.infer<typeof QueueResponseItemSchema>;

export const QueueResponseSchema = z.object({
    currentQueueSongId: z.any(),
    queue: z.array(QueueResponseItemSchema),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;

export const BaseAlbumSongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
});

export type BaseAlbumSongResponse = z.infer<typeof BaseAlbumSongResponseSchema>;

export const RegisterResponseSchema = z.object({
    userId: z.string(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const BaseArtistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string(),
    genres: z.any(),
});

export type BaseArtistResponse = z.infer<typeof BaseArtistResponseSchema>;

export const StartDownloadResponseSchema = z.object({
    downloadGroupId: z.string(),
});

export type StartDownloadResponse = z.infer<typeof StartDownloadResponseSchema>;

export const ExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});

export type ExternalImageResponse = z.infer<typeof ExternalImageResponseSchema>;

export const AlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.any(),
    spotifyId: z.string(),
    externalImages: z.any(),
});

export type AlbumResponse = z.infer<typeof AlbumResponseSchema>;

export const SongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    album: BaseSongAlbumResponseSchema,
    spotifyId: z.string(),
});

export type SongResponse = z.infer<typeof SongResponseSchema>;

export const ChannelResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string().nullable(),
    subscriberCount: z.number(),
    videoCount: z.number(),
    viewCount: z.number(),
    description: z.string().nullable(),
});

export type ChannelResponse = z.infer<typeof ChannelResponseSchema>;

export const VideoResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    youtubeId: z.string(),
    name: z.string(),
    duration: z.number(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    internalImageUrl: z.string().nullable(),
    channel: ChannelResponseSchema.nullable(),
    description: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tags: z.array(z.string()),
    publishedAt: z.string().nullable(),
});

export type VideoResponse = z.infer<typeof VideoResponseSchema>;
