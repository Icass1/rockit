// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UploadSongRequestSchema } from "./uploadSongRequest";

export const UploadAlbumRequestSchema = z.object({
    title: z.string(),
    artistNames: z.array(z.string()),
    songs: z.array(z.lazy(() => UploadSongRequestSchema)),
    releaseDate: z.string(),
});

export type UploadAlbumRequest = z.infer<typeof UploadAlbumRequestSchema>;
