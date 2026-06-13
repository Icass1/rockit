// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserRequestResponseSchema = z.object({
    publicId: z.string(),
    mediaPublicId: z.string().nullable(),
    requestType: z.string(),
    proposedValue: z.string(),
    comment: z.string().nullable(),
    status: z.string(),
    reviewComment: z.string().nullable(),
    dateAdded: z.iso.datetime(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
});

export type UserRequestResponse = z.infer<typeof UserRequestResponseSchema>;
