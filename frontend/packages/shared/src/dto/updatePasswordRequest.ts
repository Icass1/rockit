// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UpdatePasswordRequestSchema = z.object({
    password: z.string(),
});

export type UpdatePasswordRequest = z.infer<typeof UpdatePasswordRequestSchema>;
