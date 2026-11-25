// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const SharedMediaItemSchema = z.object({
    publicId: z.string(),
    senderPublicId: z.string(),
    senderUsername: z.string(),
    senderImageUrl: z.string().nullable().default(null),
    recipientPublicId: z.string(),
    recipientUsername: z.string(),
    mediaPublicId: z.string(),
    mediaName: z.string(),
    mediaImageUrl: z.string().nullable().default(null),
    mediaType: z.string(),
    artistName: z.string().nullable().default(null),
    message: z.string().nullable().default(null),
    seen: z.boolean(),
    dateAdded: z.iso.datetime(),
});

export type SharedMediaItem = z.infer<typeof SharedMediaItemSchema>;
