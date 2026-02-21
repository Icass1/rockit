import os
import uuid
import requests as req
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Result, Select

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.db.ormModels.playlist import CorePlaylistRow

from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow
from backend.spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow
from backend.spotify.access.db.ormModels.internalImage import InternalImageRow
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow
from backend.spotify.access.db.ormModels.genre import GenreRow
from backend.spotify.access.db.ormModels.copyright import CopyrightRow

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum

from backend.constants import IMAGES_PATH


logger = getLogger(__name__)


class SpotifyAccess:
    @staticmethod
    async def get_album_async(id: str) -> AResult[AlbumRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[AlbumRow]] = (
                    select(AlbumRow)
                    .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                    .where(CoreAlbumRow.public_id == id)
                )
                result: Result[Tuple[AlbumRow]] = await s.execute(stmt)
                album: AlbumRow | None = result.scalar_one_or_none()

                if not album:
                    logger.error("Album not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

                # Detach from session BEFORE closing session.
                s.expunge(instance=album)
                return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {id}: {e}")

    @staticmethod
    async def get_track_async(id: str) -> AResult[TrackRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = (
                    select(TrackRow)
                    .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                    .where(CoreSongRow.public_id == id)
                )
                result = await s.execute(stmt)
                track: TrackRow | None = result.scalar_one_or_none()

                if not track:
                    logger.error("Track not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

                s.expunge(instance=track)
                return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from id {id}: {e}")

    @staticmethod
    async def get_artist_async(id: str) -> AResult[ArtistRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = (
                    select(ArtistRow)
                    .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                    .where(CoreArtistRow.public_id == id)
                )
                result = await s.execute(stmt)
                artist: ArtistRow | None = result.scalar_one_or_none()

                if not artist:
                    logger.error("Artist not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

                s.expunge(instance=artist)
                return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist from id {id}: {e}")

    @staticmethod
    async def get_playlist_async(id: str) -> AResult[SpotifyPlaylistRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = (
                    select(SpotifyPlaylistRow)
                    .join(CorePlaylistRow, CorePlaylistRow.id == SpotifyPlaylistRow.id)
                    .where(CorePlaylistRow.public_id == id)
                )
                result = await s.execute(stmt)
                playlist: SpotifyPlaylistRow | None = result.scalar_one_or_none()

                if not playlist:
                    logger.error("Playlist not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

                s.expunge(instance=playlist)
                return AResult(code=AResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist from id {id}: {e}")

    # ── Image helpers ────────────────────────────────────────────────────────

    @staticmethod
    async def _download_and_create_internal_image(
            url: str, session: AsyncSession) -> AResult[InternalImageRow]:
        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                return AResult(code=AResultCode.GENERAL_ERROR, message="Image download failed")
            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(IMAGES_PATH, filename)
            with open(full_path, 'wb') as f:
                f.write(response.content)
            img = InternalImageRow(public_id=str(uuid.uuid4()), url=url, path=filename)
            session.add(img)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=img)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}")

    @staticmethod
    async def _get_or_create_external_image(
            url: str, width: int | None, height: int | None,
            session: AsyncSession) -> AResult[ExternalImageRow]:
        try:
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row: ExternalImageRow | None = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            row = ExternalImageRow(public_id=str(uuid.uuid4()), url=url, width=width, height=height)
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create external image: {e}")

    @staticmethod
    async def _get_or_create_genre(name: str, session: AsyncSession) -> AResult[GenreRow]:
        try:
            stmt = select(GenreRow).where(GenreRow.name == name)
            result = await session.execute(stmt)
            row: GenreRow | None = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            row = GenreRow(name=name)
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create genre: {e}")

    # ── Entity population helpers ─────────────────────────────────────────────

    @staticmethod
    async def get_or_create_artist(
            raw: RawSpotifyApiArtist, session: AsyncSession,
            provider_id: int) -> AResult[ArtistRow]:
        try:
            stmt = (
                select(ArtistRow)
                .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                .where(CoreArtistRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: ArtistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # Download highest-res image
            internal_image_id: int | None = None
            if raw.images:
                a_img = await SpotifyAccess._download_and_create_internal_image(
                    raw.images[0].url, session)
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            core_artist = CoreArtistRow(public_id=raw.id, provider_id=provider_id)
            session.add(core_artist)
            await session.flush()

            followers = raw.followers.total if raw.followers and raw.followers.total is not None else 0
            popularity = raw.popularity if raw.popularity is not None else 0

            artist_row = ArtistRow(
                id=core_artist.id,
                name=raw.name or "",
                followers=followers,
                popularity=popularity,
                internal_image_id=internal_image_id)
            session.add(artist_row)
            await session.flush()

            # Link genres
            if raw.genres:
                for genre_name in raw.genres:
                    a_genre = await SpotifyAccess._get_or_create_genre(genre_name, session)
                    if a_genre.is_ok():
                        artist_row.genres.append(a_genre.result())

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            img.url, img.width, img.height, session)
                        if a_ext.is_ok():
                            artist_row.external_images.append(a_ext.result())

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=artist_row)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create artist: {e}")

    @staticmethod
    async def get_or_create_album(
            raw: RawSpotifyApiAlbum, artist_map: Dict[str, ArtistRow],
            session: AsyncSession, provider_id: int) -> AResult[AlbumRow]:
        try:
            stmt = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(CoreAlbumRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: AlbumRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # disc_count
            disc_count = 1
            if raw.tracks and raw.tracks.items:
                disc_count = max(
                    (item.disc_number or 1) for item in raw.tracks.items)

            # Download highest-res image
            internal_image_id: int | None = None
            if raw.images:
                a_img = await SpotifyAccess._download_and_create_internal_image(
                    raw.images[0].url, session)
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            if internal_image_id is None:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to create internal image for album")

            core_album = CoreAlbumRow(public_id=raw.id, provider_id=provider_id)
            session.add(core_album)
            await session.flush()

            album_row = AlbumRow(
                id=core_album.id,
                internal_image_id=internal_image_id,
                name=raw.name or "",
                release_date=raw.release_date or "",
                popularity=raw.popularity if raw.popularity is not None else 0,
                disc_count=disc_count)
            session.add(album_row)
            await session.flush()

            # Link artists
            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        album_row.artists.append(artist_map[a.id])

            # Link copyrights
            if raw.copyrights:
                for c in raw.copyrights:
                    if c.type and c.type in CopyrightTypeEnum.__members__:
                        type_key = CopyrightTypeEnum[c.type].value
                        cr = CopyrightRow(text=c.text or "", type_key=type_key)
                        session.add(cr)
                        await session.flush()
                        album_row.copyrights.append(cr)

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            img.url, img.width, img.height, session)
                        if a_ext.is_ok():
                            album_row.external_images.append(a_ext.result())

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=album_row)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create album: {e}")

    @staticmethod
    async def get_or_create_track(
            raw: RawSpotifyApiTrack, artist_map: Dict[str, ArtistRow],
            album_row: AlbumRow, session: AsyncSession,
            provider_id: int) -> AResult[TrackRow]:
        try:
            stmt = (
                select(TrackRow)
                .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                .where(CoreSongRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: TrackRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            isrc = ""
            if raw.external_ids and raw.external_ids.isrc:
                isrc = raw.external_ids.isrc

            core_song = CoreSongRow(public_id=raw.id, provider_id=provider_id)
            session.add(core_song)
            await session.flush()

            track_row = TrackRow(
                id=core_song.id,
                name=raw.name or "",
                duration=raw.duration_ms if raw.duration_ms is not None else 0,
                track_number=raw.track_number if raw.track_number is not None else 0,
                disc_number=raw.disc_number if raw.disc_number is not None else 1,
                internal_image_id=album_row.internal_image_id,
                album_id=album_row.id,
                isrc=isrc,
                popularity=raw.popularity,
                preview_url=raw.preview_url)
            session.add(track_row)
            await session.flush()

            # Link artists
            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        track_row.artists.append(artist_map[a.id])

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=track_row)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create track: {e}")

    @staticmethod
    async def get_or_create_playlist(
            raw: RawSpotifyApiPlaylist,
            track_row_map: Dict[str, TrackRow],
            session: AsyncSession,
            provider_id: int) -> AResult[SpotifyPlaylistRow]:
        try:
            stmt = (
                select(SpotifyPlaylistRow)
                .join(CorePlaylistRow, CorePlaylistRow.id == SpotifyPlaylistRow.id)
                .where(CorePlaylistRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: SpotifyPlaylistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # Download image
            internal_image_id: int | None = None
            if raw.images:
                a_img = await SpotifyAccess._download_and_create_internal_image(
                    raw.images[0].url, session)
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            owner = ""
            if raw.owner:
                owner = raw.owner.display_name or raw.owner.id or ""

            core_playlist = CorePlaylistRow(public_id=raw.id, provider_id=provider_id)
            session.add(core_playlist)
            await session.flush()

            playlist_row = SpotifyPlaylistRow(
                id=core_playlist.id,
                name=raw.name or "",
                owner=owner,
                internal_image_id=internal_image_id,
                followers=0,
                description=raw.description)
            session.add(playlist_row)
            await session.flush()

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            img.url, img.width, img.height, session)
                        if a_ext.is_ok():
                            playlist_row.external_images.append(a_ext.result())

            # Create PlaylistTrackRow links
            if raw.tracks and raw.tracks.items:
                for item in raw.tracks.items:
                    if not item.track or not item.track.id:
                        continue
                    track_row = track_row_map.get(item.track.id)
                    if not track_row:
                        continue
                    added_at = datetime.now(timezone.utc)
                    if item.added_at:
                        try:
                            added_at = datetime.fromisoformat(
                                item.added_at.replace('Z', '+00:00'))
                        except Exception:
                            pass
                    added_by = item.added_by.id if item.added_by else None
                    pt = PlaylistTrackRow(
                        playlist_id=playlist_row.id,
                        song_id=track_row.id,
                        added_at=added_at,
                        disabled=False,
                        added_by=added_by)
                    session.add(pt)

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=playlist_row)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create playlist: {e}")
