import { z } from "zod";

export const AddMediaToPlaylistRequestSchema = z.object({
    playlist_media_public_id: z.string(),
});

export type AddMediaToPlaylistRequest = z.infer<
    typeof AddMediaToPlaylistRequestSchema
>;
