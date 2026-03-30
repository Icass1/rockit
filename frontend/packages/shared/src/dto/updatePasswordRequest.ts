import { z } from "zod";

export const UpdatePasswordRequestSchema = z.object({
    password: z.string(),
});

export type UpdatePasswordRequest = z.infer<typeof UpdatePasswordRequestSchema>;
