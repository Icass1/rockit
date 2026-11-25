// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ArtifactRunSchema } from "./artifactRun";

export const GitHubArtifactSchema = z.object({
    id: z.number(),
    name: z.string(),
    expired: z.boolean(),
    expires_at: z.iso.datetime(),
    workflow_run: z
        .lazy(() => ArtifactRunSchema)
        .nullable()
        .default(null),
});

export type GitHubArtifact = z.infer<typeof GitHubArtifactSchema>;
