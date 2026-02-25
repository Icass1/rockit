import { z } from "zod";

export const SessionResponseSchema = z.object({
    username: z.any(),
    image: z.any(),
    admin: z.boolean(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
