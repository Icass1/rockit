import { z } from "zod";

export const BaseVideoResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    videoUrl: z.string().nullable(),
    audioUrl: z.string().nullable(),
    internalImageUrl: z.string(),
    duration: z.number().nullable(),
});

export type BaseVideoResponse = z.infer<typeof BaseVideoResponseSchema>;
