// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { GitHubArtifactSchema } from "./gitHubArtifact";

export const GitHubArtifactsSchema = z.object({
    artifacts: z.array(z.lazy(() => GitHubArtifactSchema)),
});

export type GitHubArtifacts = z.infer<typeof GitHubArtifactsSchema>;
