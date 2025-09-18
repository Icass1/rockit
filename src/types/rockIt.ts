// ****************************************
// ************** Song stuff **************
// ****************************************

import * as z from "zod";

export const RockItExternalImage = z.object({
    url: z.string(),
    width: z.string().nullable(),
    height: z.string().nullable(),
});

export const DynamicLyrics = z.object({
    lyrics: z.string(),
    seconds: z.number(),
});

export const RockItArtist = z.object({
    publicId: z.string(),
    name: z.string(),
    genres: z.array(z.string()),
});

export const RockItCopyright = z.object({
    text: z.string(),
    type: z.string(),
});

export const RockItAlbum = z.object({
    publicId: z.string(),
    name: z.string(),
    copyrights: z.array(RockItCopyright),
    externalImages: z.array(RockItExternalImage),
});

export const RockItSong = z.object({
    publicId: z.string(),
    name: z.string(),
    artists: z.array(RockItArtist),
    discNumber: z.number(),
    album: RockItAlbum,
    duration: z.number(),
    trackNumber: z.number(),
    internalImageUrl: z.string().nullable(),
    downloadUrl: z.string().nullable(),
    popularity: z.number().nullable(),
    dateAdded: z.string(),
    isrc: z.string(),
});

export type RockItSongType = z.infer<typeof RockItSong>;


export const RockItUser = z.object({
    

})