// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const VocabularyResponseSchema = z.object({
    vocabulary: z.record(z.string(), z.record(z.string(), z.string())),
});

export type VocabularyResponse = z.infer<typeof VocabularyResponseSchema>;
