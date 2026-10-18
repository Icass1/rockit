// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogTopIpSchema = z.object({
    ip: z.string(),
    count: z.number(),
});

export type RequestLogTopIp = z.infer<typeof RequestLogTopIpSchema>;
