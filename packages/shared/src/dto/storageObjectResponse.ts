// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const StorageObjectResponseSchema = z.object({
    publicId: z.string(),
    url: z.string().nullable(),
    key: z.string(),
    originalKey: z.string().nullable(),
    bucket: z.string(),
    contentType: z.string().nullable(),
    sizeBytes: z.number(),
    etag: z.string().nullable(),
    dateAdded: z.iso.datetime(),
    dateUpdated: z.iso.datetime(),
});

export type StorageObjectResponse = z.infer<typeof StorageObjectResponseSchema>;
