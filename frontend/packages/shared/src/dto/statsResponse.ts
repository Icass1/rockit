import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "@/dto";

export const StatsResponseSchema = z.object({
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
