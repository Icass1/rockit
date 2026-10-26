// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningBadgeDifficultySchema = z.union([
    z.literal("easy"),
    z.literal("medium"),
    z.literal("hard"),
]);

export type ListeningBadgeDifficulty = z.infer<
    typeof ListeningBadgeDifficultySchema
>;
