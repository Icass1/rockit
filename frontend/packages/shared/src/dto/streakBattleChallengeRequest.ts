// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StreakBattleChallengeRequestSchema = z.object({
    userPublicId: z.string(),
});

export type StreakBattleChallengeRequest = z.infer<
    typeof StreakBattleChallengeRequestSchema
>;
