from dataclasses import dataclass


@dataclass(frozen=True)
class AndroidBuildDownload:
    directory: str
    path: str
    filename: str
