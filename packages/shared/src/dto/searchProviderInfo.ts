// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const SearchProviderInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    onDemand: z.boolean().default(false),
});

export type SearchProviderInfo = z.infer<typeof SearchProviderInfoSchema>;
