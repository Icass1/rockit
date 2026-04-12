// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LikeMediaRequestSchema = z.object({
    publicIds: z.array(z.string()),
});

export type LikeMediaRequest = z.infer<typeof LikeMediaRequestSchema>;
