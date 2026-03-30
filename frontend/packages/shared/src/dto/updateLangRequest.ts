import { z } from "zod";

export const UpdateLangRequestSchema = z.object({
    lang: z.string(),
});

export type UpdateLangRequest = z.infer<typeof UpdateLangRequestSchema>;
