// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdatePlaylistRequestSchema = z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    isPublic: z.boolean().nullable(),
});

export type UpdatePlaylistRequest = z.infer<typeof UpdatePlaylistRequestSchema>;
