// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LikedMediaResponseSchema = z.object({
    media: z.array(z.string()),
});

export type LikedMediaResponse = z.infer<typeof LikedMediaResponseSchema>;
