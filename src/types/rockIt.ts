// ****************************************
// ************** Song stuff **************
// ****************************************

import * as z from "zod";

// #region: RockItExternalImage
export const RockItExternalImage = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});
// #endregion

// #region: RockItExternalImage
export const DynamicLyrics = z.object({
    lyrics: z.string(),
    seconds: z.number(),
});
// #endregion

// #region: RockItArtist
export const RockItArtist = z.object({
    publicId: z.string(),
    name: z.string(),
    genres: z.array(z.string()),
    externalImages: z.array(RockItExternalImage),
});
// #endregion

// #region: RockItCopyright
export const RockItCopyright = z.object({
    text: z.string(),
    type: z.string(),
});
// #endregion

// #region: RockItAlbumWithoutSongs
export const RockItAlbumWithoutSongs = z.object({
    publicId: z.string(),
    name: z.string(),
    copyrights: z.array(RockItCopyright),
    externalImages: z.array(RockItExternalImage),
    artists: z.array(RockItArtist),
    internalImageUrl: z.string().nullable(),
});
export type RockItAlbumWithoutSongs = z.infer<typeof RockItAlbumWithoutSongs>;
// #endregion

// #region: RockItPlaylist
export const RockItPlaylist = z.object({
    publicId: z.string(),
    name: z.string(),
    externalImages: z.array(RockItExternalImage),
});
export type RockItPlaylist = z.infer<typeof RockItPlaylist>;
// #endregion

// #region: RockItSongWithoutAlbum
export const RockItSongWithoutAlbum = z.object({
    publicId: z.string(),
    name: z.string(),
    artists: z.array(RockItArtist),
    discNumber: z.number(),
    duration: z.number(),
    trackNumber: z.number(),
    internalImageUrl: z.string().nullable(),
    downloadUrl: z.string().nullable(),
    popularity: z.number().nullable(),
    dateAdded: z.string(),
    isrc: z.string(),
});
export type RockItSongWithoutAlbum = z.infer<typeof RockItSongWithoutAlbum>;
// #endregion

// #region: RockItSongWithAlbum
export const RockItSongWithAlbum = RockItAlbumWithoutSongs.extend({
    album: RockItAlbumWithoutSongs,
});
export type RockItSongWithAlbum = z.infer<typeof RockItSongWithAlbum>;
// #endregion

// #region: RockItAlbumWithSongs
export const RockItAlbumWithSongs = RockItAlbumWithoutSongs.extend({
    songs: z.array(RockItSongWithoutAlbum),
});
export type RockItAlbumWithSongs = z.infer<typeof RockItAlbumWithSongs>;
// #endregion

// #region: RockItUser
export const RockItUser = z.object({
    username: z.string(),
    image: z.string().nullable(),
    admin: z.boolean(),
});
export type RockItUser = z.infer<typeof RockItUser>;
// #endregion
