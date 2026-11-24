// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserRequestResponseSchema = z.object({
    publicId: z.string(),
    mediaPublicId: z.string().nullable().default(null),
    requestType: z.enum([
        "LYRICS",
        "TITLE",
        "ARTIST",
        "ALBUM",
        "GENRE",
        "METADATA",
        "COVER_ART",
        "OTHER",
    ]),
    proposedValue: z.string(),
    comment: z.string().nullable().default(null),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
    reviewComment: z.string().nullable().default(null),
    dateAdded: z.iso.datetime(),
    userName: z.string().nullable().default(null),
    userImage: z.string().nullable().default(null),
});

export type UserRequestResponse = z.infer<typeof UserRequestResponseSchema>;
