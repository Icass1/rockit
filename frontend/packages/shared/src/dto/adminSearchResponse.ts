// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { AdminSearchResultItemSchema } from './adminSearchResultItem';

export const AdminSearchResponseSchema = z.object({
    results: z.array(z.lazy(() => AdminSearchResultItemSchema)),
});

export type AdminSearchResponse = z.infer<typeof AdminSearchResponseSchema>;