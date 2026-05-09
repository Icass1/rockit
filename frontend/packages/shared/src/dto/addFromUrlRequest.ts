// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const AddFromUrlRequestSchema = z.object({
    url: z.string(),
    playlistPublicId: z.string().nullable(),
});

export type AddFromUrlRequest = z.infer<typeof AddFromUrlRequestSchema>;
