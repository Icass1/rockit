// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LevelConfigSchema = z.object({
    level: z.number(),
    xpRequired: z.number(),
    title: z.string(),
});

export type LevelConfig = z.infer<typeof LevelConfigSchema>;
