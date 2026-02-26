import { z } from "zod";
import { BaseSongPlaylistResponseSchema } from "@/dto";

export const BasePlaylistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    songs: z.array(z.lazy(() => BaseSongPlaylistResponseSchema)),
    internalImageUrl: z.string(),
    owner: z.string(),
});

export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;
