// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LibraryResponseItemSchema = z.object({
    item: z.any(),
    addedAt: z.iso.datetime(),
});

export type LibraryResponseItem = z.infer<typeof LibraryResponseItemSchema>;
