// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SharedMediaItemSchema = z.object({
    publicId: z.string(),
    senderPublicId: z.string(),
    senderUsername: z.string(),
    senderImageUrl: z.string().nullable(),
    mediaPublicId: z.string(),
    mediaName: z.string(),
    mediaImageUrl: z.string().nullable(),
    mediaType: z.string(),
    artistName: z.string().nullable(),
    message: z.string().nullable(),
    seen: z.boolean(),
    dateAdded: z.iso.datetime(),
});

export type SharedMediaItem = z.infer<typeof SharedMediaItemSchema>;
