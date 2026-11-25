// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdatePlaylistRequestSchema = z.object({
    name: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    isPublic: z.boolean().nullable().default(null),
});

export type UpdatePlaylistRequest = z.infer<typeof UpdatePlaylistRequestSchema>;
