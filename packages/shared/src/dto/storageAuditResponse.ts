// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StorageAuditResponseSchema = z.object({
    registeredCount: z.number(),
    missingKeys: z.array(z.string()),
    unregisteredKeys: z.array(z.string()),
    sizeMismatchKeys: z.array(z.string()),
    unreferencedPublicIds: z.array(z.string()),
});

export type StorageAuditResponse = z.infer<typeof StorageAuditResponseSchema>;
