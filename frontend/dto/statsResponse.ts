import { z } from "zod";
import { BaseSongResponseSchema } from "@/dto";

export const StatsResponseSchema = z.object({
    songs: z.array(z.lazy(() => BaseSongResponseSchema)),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
