"""Local catalog shape and membership rules owned by this provider."""

from typing import Any

from sqlalchemy import Integer, String, literal, select, union_all
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect

from core.access.collectionCatalog import CollectionCatalogSource, collection_catalog
from core.access.db.shared_metadata import shared_metadata


def metadata() -> Select[Any] | CompoundSelect[Any]:
    """Project names and artwork without loading collection contents."""
    album = shared_metadata.tables["spotify_scrapper.album"]
    playlist = shared_metadata.tables["spotify_scrapper.playlist"]
    track = shared_metadata.tables["spotify_scrapper.track"]
    artist = shared_metadata.tables["spotify_scrapper.artist"]
    return union_all(
        select(
            album.c.id.label("id"), album.c.name.label("name"), album.c.image_id.label("image_id")
        ),
        select(
            playlist.c.id.label("id"),
            playlist.c.name.label("name"),
            playlist.c.image_id.label("image_id"),
        ),
        select(
            track.c.id.label("id"), track.c.name.label("name"), album.c.image_id.label("image_id")
        ).outerjoin(album, album.c.id == track.c.album_id),
        select(
            artist.c.id.label("id"),
            artist.c.name.label("name"),
            artist.c.image_id.label("image_id"),
        ),
    )


def edges(user_id: int) -> Select[Any] | CompoundSelect[Any]:
    """Project provider membership, order and disabled-item policy."""
    tracks = shared_metadata.tables["spotify_scrapper.track"]
    members = shared_metadata.tables["spotify_scrapper.playlist_track"]
    return union_all(
        select(
            tracks.c.album_id.label("parent_id"),
            tracks.c.id.label("media_id"),
            (tracks.c.disc_number * 1000000 + tracks.c.track_number).label("position"),
            tracks.c.date_added.label("added_at"),
        ).where(tracks.c.album_id.is_not(None)),
        select(
            members.c.playlist_id.label("parent_id"),
            members.c.song_id.label("media_id"),
            members.c.song_id.label("position"),
            members.c.added_at.label("added_at"),
        ).where(members.c.disabled.is_(False)),
    )


def details() -> Select[Any] | CompoundSelect[Any]:
    """Project neutral collection summaries in a fixed column order."""
    album = shared_metadata.tables["spotify_scrapper.album"]
    playlist = shared_metadata.tables["spotify_scrapper.playlist"]
    return union_all(
        select(
            album.c.id.label("id"),
            album.c.image_id.label("image_id"),
            album.c.spotify_id.label("external_id"),
            album.c.release_date.label("release_date"),
            literal(None, String).label("description"),
            literal(None, Integer).label("owner_id"),
            literal(None, String).label("owner"),
        ),
        select(
            playlist.c.id.label("id"),
            playlist.c.image_id.label("image_id"),
            playlist.c.spotify_id.label("external_id"),
            literal(None, String).label("release_date"),
            playlist.c.description.label("description"),
            literal(None, Integer).label("owner_id"),
            playlist.c.owner.label("owner"),
        ),
    )


def artists() -> Select[Any] | CompoundSelect[Any]:
    """Project album artist relationships using this provider's schema."""
    links = shared_metadata.tables["spotify_scrapper.album_artist"]
    artist = shared_metadata.tables["spotify_scrapper.artist"]
    return select(
        links.c.album_id.label("parent_id"),
        artist.c.id.label("artist_id"),
        artist.c.name.label("name"),
        artist.c.image_id.label("image_id"),
        literal("spotify_scrapper").label("provider"),
    ).join(artist, artist.c.id == links.c.artist_id)


collection_catalog.register(
    CollectionCatalogSource(
        key="spotifyScrapper", metadata=metadata, edges=edges, details=details, artists=artists
    )
)
