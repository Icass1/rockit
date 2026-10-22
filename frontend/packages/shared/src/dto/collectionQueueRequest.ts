// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CollectionQueueRequestSchema = z.object({
    startPublicId: z.string().nullable(),
});

export type CollectionQueueRequest = z.infer<
    typeof CollectionQueueRequestSchema
>;
