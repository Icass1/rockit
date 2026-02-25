import { z } from 'zod';

export const LoginResponseSchema = z.object({
    userId: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;