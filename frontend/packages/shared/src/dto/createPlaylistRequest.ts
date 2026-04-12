// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const CreatePlaylistRequestSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
    isPublic: z.boolean().default(true),
});

export type CreatePlaylistRequest = z.infer<typeof CreatePlaylistRequestSchema>;
