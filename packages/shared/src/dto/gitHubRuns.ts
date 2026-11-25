// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { GitHubRunSchema } from "./gitHubRun";

export const GitHubRunsSchema = z.object({
    workflow_runs: z.array(z.lazy(() => GitHubRunSchema)),
});

export type GitHubRuns = z.infer<typeof GitHubRunsSchema>;
