import { z } from "zod";

export const SessionResponseSchema = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
