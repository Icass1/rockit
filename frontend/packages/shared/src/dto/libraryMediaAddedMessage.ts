// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LibraryMediaAddedMessageSchema = z.object({
    type: z
        .union([z.literal("library_media_added")])
        .default("library_media_added"),
    publicId: z.string(),
});

export type LibraryMediaAddedMessage = z.infer<
    typeof LibraryMediaAddedMessageSchema
>;
