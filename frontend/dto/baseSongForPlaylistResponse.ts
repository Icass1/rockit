import { BaseSongWithAlbumResponseSchema } from "@/dto";
import { z } from "zod";

export const BaseSongForPlaylistResponseSchema = z.object({
    song: z.lazy(() => BaseSongWithAlbumResponseSchema),
    addedAt: z.iso.datetime(),
});

export type BaseSongForPlaylistResponse = z.infer<
    typeof BaseSongForPlaylistResponseSchema
>;
