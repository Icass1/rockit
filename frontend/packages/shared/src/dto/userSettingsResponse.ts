// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UserSettingsResponseSchema = z.object({
    username: z.string(),
    lang: z.string(),
    crossfade: z.number(),
    queueType: z.enum(["RANDOM", "SORTED"]),
    repeatMode: z.enum(["OFF", "ONE", "ALL"]),
});

export type UserSettingsResponse = z.infer<typeof UserSettingsResponseSchema>;
