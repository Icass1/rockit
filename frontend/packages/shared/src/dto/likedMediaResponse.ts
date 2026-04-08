import { z } from "zod";

export const LikedMediaResponseSchema = z.object({
    media: z.array(z.string()),
});

export type LikedMediaResponse = z.infer<typeof LikedMediaResponseSchema>;
