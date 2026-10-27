// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningMilestoneResponseSchema = z.object({
    minutes: z.number(),
    xp: z.number(),
    reached: z.boolean(),
});

export type ListeningMilestoneResponse = z.infer<
    typeof ListeningMilestoneResponseSchema
>;
