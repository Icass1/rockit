import { z } from "zod";

export const PlaylistResponseItemSchema = z.object({
    item: z.any(),
    addedAt: z.iso.datetime(),
});

export type PlaylistResponseItem = z.infer<typeof PlaylistResponseItemSchema>;
