import { z } from "zod";

export const CreatePlaylistRequestSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
    isPublic: z.boolean().default(true),
});

export type CreatePlaylistRequest = z.infer<typeof CreatePlaylistRequestSchema>;
