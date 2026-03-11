import { PlaylistResponseSchema } from "@/dto";
import { z } from "zod";

export const PlaylistListResponseSchema = z.object({
    playlists: z.array(z.lazy(() => PlaylistResponseSchema)),
});

export type PlaylistListResponse = z.infer<typeof PlaylistListResponseSchema>;
