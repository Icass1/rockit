// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseSearchResultsItemSchema } from './baseSearchResultsItem';
import { BaseSongWithAlbumResponseSchema } from './baseSongWithAlbumResponse';

export const SongListResponseSchema = z.object({
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    discover: z.array(z.lazy(() => BaseSearchResultsItemSchema)).default([]),
});

export type SongListResponse = z.infer<typeof SongListResponseSchema>;