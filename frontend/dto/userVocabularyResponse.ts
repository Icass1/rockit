import { z } from "zod";

export const UserVocabularyResponseSchema = z.object({
    vocabulary: z.any(),
});

export type UserVocabularyResponse = z.infer<
    typeof UserVocabularyResponseSchema
>;
