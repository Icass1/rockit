// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StatsMinutesEntryResponseSchema = z.object({
    minutes: z.number(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    label: z.string().default(""),
});

export type StatsMinutesEntryResponse = z.infer<
    typeof StatsMinutesEntryResponseSchema
>;
