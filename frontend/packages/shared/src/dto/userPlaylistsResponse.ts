// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BasePlaylistWithMediasResponseSchema } from "./basePlaylistWithMediasResponse";

export const UserPlaylistsResponseSchema = z.object({
    playlists: z.array(z.lazy(() => BasePlaylistWithMediasResponseSchema)),
});

export type UserPlaylistsResponse = z.infer<typeof UserPlaylistsResponseSchema>;
