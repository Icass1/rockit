import { z } from "zod";
import { BaseSongResponseSchema } from "@/dto";

export const HomeStatsResponseSchema = z.object({
    songsByTimePlayed: z.array(z.lazy(() => BaseSongResponseSchema)),
    randomSongsLastMonth: z.array(z.lazy(() => BaseSongResponseSchema)),
    nostalgicMix: z.array(z.lazy(() => BaseSongResponseSchema)),
    hiddenGems: z.array(z.lazy(() => BaseSongResponseSchema)),
    communityTop: z.array(z.lazy(() => BaseSongResponseSchema)),
    monthlyTop: z.array(z.lazy(() => BaseSongResponseSchema)),
    moodSongs: z.array(z.lazy(() => BaseSongResponseSchema)),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponseSchema>;
