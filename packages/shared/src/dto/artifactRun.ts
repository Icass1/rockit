// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtifactRunSchema = z.object({
    id: z.number(),
});

export type ArtifactRun = z.infer<typeof ArtifactRunSchema>;
