import { z } from "zod";

export const VocabularyResponseSchema = z.object({
    vocabulary: z.any(),
});

export type VocabularyResponse = z.infer<typeof VocabularyResponseSchema>;
