import { z } from "zod";

export const UserVocabularyResponseSchema = z.object({
    vocabulary: z.record(z.string(), z.string()),
    currentLang: z.string(),
});

export type UserVocabularyResponse = z.infer<
    typeof UserVocabularyResponseSchema
>;
