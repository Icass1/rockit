import { z } from 'zod';
import { BaseAlbumResponseSchema } from './baseAlbumResponse';
import { BasePlaylistResponseSchema } from './basePlaylistResponse';

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;