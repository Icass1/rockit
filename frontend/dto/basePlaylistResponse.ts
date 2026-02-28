import { z } from "zod";
import { BaseSongForPlaylistResponseSchema } from "@/dto";

export const BasePlaylistResponseSchema = z.object({
    type: z.union([z.literal("playlist")]),
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    songs: z.array(z.lazy(() => BaseSongForPlaylistResponseSchema)),
    internalImageUrl: z.string(),
    owner: z.string(),
});

export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;
