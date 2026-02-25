import { z } from 'zod';

export const RegisterResponseSchema = z.object({
    userId: z.string(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;