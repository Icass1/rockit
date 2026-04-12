// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { LanguageItemSchema } from "./languageItem";

export const LanguagesResponseSchema = z.object({
    languages: z.array(z.lazy(() => LanguageItemSchema)),
});

export type LanguagesResponse = z.infer<typeof LanguagesResponseSchema>;
