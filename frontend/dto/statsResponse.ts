import { BaseSongWithAlbumResponseSchema } from "@/dto";
import { z } from "zod";

export const StatsResponseSchema = z.object({
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
