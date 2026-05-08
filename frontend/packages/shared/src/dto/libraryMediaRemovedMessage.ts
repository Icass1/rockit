// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LibraryMediaRemovedMessageSchema = z.object({
    type: z
        .union([z.literal("library_media_removed")])
        .default("library_media_removed"),
    publicId: z.string(),
});

export type LibraryMediaRemovedMessage = z.infer<
    typeof LibraryMediaRemovedMessageSchema
>;
