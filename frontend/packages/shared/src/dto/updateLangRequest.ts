// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const UpdateLangRequestSchema = z.object({
    lang: z.string(),
});

export type UpdateLangRequest = z.infer<typeof UpdateLangRequestSchema>;
