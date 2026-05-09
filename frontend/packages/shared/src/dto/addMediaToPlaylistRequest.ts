// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const AddMediaToPlaylistRequestSchema = z.object({
    mediaPublicId: z.string(),
});

export type AddMediaToPlaylistRequest = z.infer<
    typeof AddMediaToPlaylistRequestSchema
>;
