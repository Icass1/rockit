from dataclasses import dataclass

from sqlalchemy import Table


@dataclass(frozen=True)
class MetadataReviewTables:
    media: dict[int, Table]
    title_columns: dict[int, str]
    artist: Table
    album: Table
    album_title: str
    artist_links: dict[int, tuple[Table, str]]
