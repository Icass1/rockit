// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UpdatePlaylistRequestSchema = z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    is_public: z.boolean().nullable(),
});

export type UpdatePlaylistRequest = z.infer<typeof UpdatePlaylistRequestSchema>;
