// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";

export const StatsResponseSchema = z.object({
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
