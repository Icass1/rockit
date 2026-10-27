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
]);

export type ListeningBadgeScope = z.infer<typeof ListeningBadgeScopeSchema>;
