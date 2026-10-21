// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { FriendStatsResponseSchema } from "./friendStatsResponse";

export const CompareStatsResponseSchema = z.object({
    myStats: z.lazy(() => FriendStatsResponseSchema),
    friendStats: z.lazy(() => FriendStatsResponseSchema),
    vibeScore: z.number().default(0),
    vibeDescriptor: z.string().default(""),
});

export type CompareStatsResponse = z.infer<typeof CompareStatsResponseSchema>;
