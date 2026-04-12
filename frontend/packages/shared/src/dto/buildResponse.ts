// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const BuildResponseSchema = z.object({
    id: z.number(),
    version: z.string(),
    apkFilename: z.string(),
    description: z.string().nullable(),
    downloads: z.number(),
    dateAdded: z.iso.datetime(),
});

export type BuildResponse = z.infer<typeof BuildResponseSchema>;
