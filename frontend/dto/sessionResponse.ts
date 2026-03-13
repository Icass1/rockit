import { z } from "zod";

export const SessionResponseSchema = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
    queueType: z.any(),
    currentTimeMs: z.number().nullable(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
