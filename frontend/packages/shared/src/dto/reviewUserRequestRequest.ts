// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ReviewUserRequestRequestSchema = z.object({
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
    reviewComment: z.string().nullable(),
});

export type ReviewUserRequestRequest = z.infer<
    typeof ReviewUserRequestRequestSchema
>;
