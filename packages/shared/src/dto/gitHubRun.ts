// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const GitHubRunSchema = z.object({
    id: z.number(),
    run_number: z.number(),
    head_branch: z.string().nullable(),
    head_sha: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    created_at: z.iso.datetime(),
    html_url: z.string(),
});

export type GitHubRun = z.infer<typeof GitHubRunSchema>;
