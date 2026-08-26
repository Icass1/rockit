// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserRequestResponseSchema = z.object({
    publicId: z.string(),
    mediaPublicId: z.string().nullable(),
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
    comment: z.string().nullable(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
    reviewComment: z.string().nullable(),
    dateAdded: z.iso.datetime(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
});

export type UserRequestResponse = z.infer<typeof UserRequestResponseSchema>;
