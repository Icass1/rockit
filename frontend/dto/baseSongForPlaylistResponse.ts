import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "@/dto";

export const BaseSongForPlaylistResponseSchema = z.object({
    song: z.lazy(() => BaseSongWithAlbumResponseSchema),
    addedAt: z.iso.datetime(),
});

export type BaseSongForPlaylistResponse = z.infer<
    typeof BaseSongForPlaylistResponseSchema
>;
