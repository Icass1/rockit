// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningBadgeLeagueSchema = z.union([
    z.literal("bronze"),
    z.literal("silver"),
    z.literal("gold"),
    z.literal("platinum"),
    z.literal("diamond"),
    z.literal("legend"),
]);

export type ListeningBadgeLeague = z.infer<typeof ListeningBadgeLeagueSchema>;
