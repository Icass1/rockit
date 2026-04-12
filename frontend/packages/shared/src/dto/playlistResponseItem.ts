// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistResponseItemSchema = z.object({
    item: z.any(),
    addedAt: z.iso.datetime(),
});

export type PlaylistResponseItem = z.infer<typeof PlaylistResponseItemSchema>;
