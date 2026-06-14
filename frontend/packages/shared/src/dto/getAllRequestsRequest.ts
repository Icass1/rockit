// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const GetAllRequestsRequestSchema = z.object({
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).nullable(),
    limit: z.number().default(50),
    offset: z.number().default(0),
});

export type GetAllRequestsRequest = z.infer<typeof GetAllRequestsRequestSchema>;
