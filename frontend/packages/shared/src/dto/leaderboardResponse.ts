// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UserLevelResponseSchema } from "./userLevelResponse";

export const LeaderboardResponseSchema = z.object({
    entries: z.array(z.lazy(() => UserLevelResponseSchema)),
    currentUser: z.lazy(() => UserLevelResponseSchema).nullable(),
});

export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
