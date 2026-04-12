// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const LanguageItemSchema = z.object({
    langCode: z.string(),
    language: z.string(),
});

export type LanguageItem = z.infer<typeof LanguageItemSchema>;
