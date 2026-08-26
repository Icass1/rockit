// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { StatsHeatmapCellResponseSchema } from "./statsHeatmapCellResponse";
import { StatsMinutesEntryResponseSchema } from "./statsMinutesEntryResponse";
import { StatsRankedItemResponseSchema } from "./statsRankedItemResponse";
import { StatsV2SummaryResponseSchema } from "./statsV2SummaryResponse";

export const UserStatsV2ResponseSchema = z.object({
    summary: z.lazy(() => StatsV2SummaryResponseSchema),
    minutes: z.array(z.lazy(() => StatsMinutesEntryResponseSchema)),
    topSongs: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    topVideos: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    topAlbums: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    topArtists: z.array(z.lazy(() => StatsRankedItemResponseSchema)),
    heatmap: z.array(z.lazy(() => StatsHeatmapCellResponseSchema)),
});

export type UserStatsV2Response = z.infer<typeof UserStatsV2ResponseSchema>;
