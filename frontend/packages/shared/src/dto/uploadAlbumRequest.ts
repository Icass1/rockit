// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UploadSongRequestSchema } from "./uploadSongRequest";

export const UploadAlbumRequestSchema = z.object({
    title: z.string(),
    artistName: z.array(z.string()),
    songs: z.array(z.lazy(() => UploadSongRequestSchema)),
});

export type UploadAlbumRequest = z.infer<typeof UploadAlbumRequestSchema>;
