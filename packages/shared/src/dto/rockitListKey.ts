// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const RockitListKeySchema = z.union([
    z.literal("liked"),
    z.literal("most-listened"),
    z.literal("recent-mix"),
    z.literal("last-month"),
    z.literal("year-recap"),
]);

export type RockitListKey = z.infer<typeof RockitListKeySchema>;
