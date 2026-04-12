// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const AddVersionRequestSchema = z.object({
    version: z.string(),
    apkFilename: z.string(),
    description: z.string().nullable(),
});

export type AddVersionRequest = z.infer<typeof AddVersionRequestSchema>;
