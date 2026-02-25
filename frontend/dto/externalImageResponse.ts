import { z } from 'zod';

export const ExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});

export type ExternalImageResponse = z.infer<typeof ExternalImageResponseSchema>;