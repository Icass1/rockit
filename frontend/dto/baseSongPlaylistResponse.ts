import { z } from "zod";
import { BaseSongResponseSchema } from "@/dto";

export const BaseSongPlaylistResponseSchema = z.object({
    song: z.lazy(() => BaseSongResponseSchema),
    addedAt: z.iso.datetime(),
});

export type BaseSongPlaylistResponse = z.infer<
    typeof BaseSongPlaylistResponseSchema
>;
