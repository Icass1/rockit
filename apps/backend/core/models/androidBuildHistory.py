from datetime import datetime

from pydantic import BaseModel


class GitHubRun(BaseModel):
    id: int
    run_number: int
    head_branch: str | None
    head_sha: str
    status: str
    conclusion: str | None
    created_at: datetime
    html_url: str


class GitHubRuns(BaseModel):
    workflow_runs: list[GitHubRun]


class ArtifactRun(BaseModel):
    id: int


class GitHubArtifact(BaseModel):
    id: int
    name: str
    expired: bool
    expires_at: datetime
    workflow_run: ArtifactRun | None = None


class GitHubArtifacts(BaseModel):
    artifacts: list[GitHubArtifact]
