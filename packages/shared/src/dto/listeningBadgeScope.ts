// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningBadgeScopeSchema = z.union([
    z.literal("session"),
    z.literal("total"),
    z.literal("plays"),
    z.literal("discovery"),
    z.literal("streak"),
    z.literal("sharing"),
    z.literal("friends"),
    z.literal("videos"),
    z.literal("mixed"),
    z.literal("active_days"),
    z.literal("night"),
    z.literal("early"),
    z.literal("weekend"),
    z.literal("tenure"),
    z.literal("anniversary"),
    z.literal("secrets"),
]);

export type ListeningBadgeScope = z.infer<typeof ListeningBadgeScopeSchema>;
