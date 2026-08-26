// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CreateUserRequestRequestSchema = z.object({
    mediaPublicId: z.string(),
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
});

export type CreateUserRequestRequest = z.infer<
    typeof CreateUserRequestRequestSchema
>;
