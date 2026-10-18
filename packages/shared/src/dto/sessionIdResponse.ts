// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SessionIdResponseSchema = z.object({
    sessionId: z.string(),
});

export type SessionIdResponse = z.infer<typeof SessionIdResponseSchema>;
