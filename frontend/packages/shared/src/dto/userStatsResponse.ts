import { z } from "zod";
import { StatsHeatmapCellResponseSchema } from "./statsHeatmapCellResponse";
import { StatsMinutesEntryResponseSchema } from "./statsMinutesEntryResponse";
import { StatsRankedItemResponseSchema } from "./statsRankedItemResponse";
import { StatsSummaryResponseSchema } from "./statsSummaryResponse";

export const UserStatsResponseSchema = z.object({
    summary: z.lazy(() => StatsSummaryResponseSchema),
    minutes: z.array(z.lazy(() => StatsMinutesEntryResponseSchema)),
    topSongs: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    topAlbums: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    topArtists: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    heatmap: z.array(z.lazy(() => StatsHeatmapCellResponseSchema)),
});

export type UserStatsResponse = z.infer<typeof UserStatsResponseSchema>;
