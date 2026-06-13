// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CreateUserRequestRequestSchema = z.object({
    mediaPublicId: z.string().nullable(),
    requestType: z.string(),
    proposedValue: z.string(),
    comment: z.string().nullable(),
});

export type CreateUserRequestRequest = z.infer<
    typeof CreateUserRequestRequestSchema
>;
