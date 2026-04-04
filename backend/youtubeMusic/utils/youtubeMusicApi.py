from typing import Any, Dict, List, Optional, cast
from dataclasses import dataclass

from yt_dlp import YoutubeDL


def _create_youtube_dl(opts: Any) -> Any:
    return YoutubeDL(opts)


from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

logger = getLogger(__name__)


@dataclass
class YoutubeMusicTrack:
    youtube_id: str
    title: str
    artists: List[str]
    album: str
    album_youtube_id: Optional[str] = None
    duration_ms: int = 0
    thumbnail_url: str = ""
    isrc: Optional[str] = None
    release_year: Optional[int] = None


@dataclass
class YoutubeMusicAlbum:
    youtube_id: str
    title: str
    artists: List[str]
    release_year: Optional[int]
    thumbnail_url: str


@dataclass
class YoutubeMusicArtist:
    youtube_id: str
    name: str
    thumbnail_url: str


@dataclass
class YoutubeMusicPlaylistTrack:
    youtube_id: str
    title: str
    artists: List[str]
    album: str
    duration_ms: int
    thumbnail_url: str


@dataclass
class YoutubeMusicPlaylist:
    youtube_id: str
    title: str
    description: str
    thumbnail_url: str
    tracks: List[YoutubeMusicPlaylistTrack]


class YoutubeMusicApi:
    @staticmethod
    async def search_track_async(
        query: str, max_results: int = 5
    ) -> AResult[List[YoutubeMusicTrack]]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "default_search": f"ytsearch{max_results}:",
                "extract_flat": False,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _search() -> Any:
                opts: Any = ydl_opts
                with YoutubeDL(opts) as ydl:
                    return ydl.extract_info(query, download=False)

            info: Any = await loop.run_in_executor(None, _search)

            if not info or "entries" not in info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="No results found",
                )

            entries: Any = info["entries"]
            tracks: List[YoutubeMusicTrack] = []
            for entry in entries:
                entry_dict: Dict[str, Any] = cast(Dict[str, Any], entry)

                extractor = entry_dict.get("extractor")
                if extractor != "youtube:playlist":
                    continue
                availability = entry_dict.get("availability")
                if availability != "public":
                    continue

                duration_ms = 0
                duration_val = entry_dict.get("duration")
                if duration_val is not None:
                    duration_ms = int(duration_val) * 1000

                thumbnail = ""
                thumbnails = entry_dict.get("thumbnails")
                if thumbnails and len(thumbnails) > 0:
                    thumb = cast(Dict[str, Any], thumbnails[0])
                    thumb_url = cast(Optional[str], thumb.get("url"))
                    if thumb_url is not None:
                        thumbnail = thumb_url

                artists: List[str] = []
                artist_val = entry_dict.get("artist")
                if artist_val is not None:
                    artists = [str(artist_val)]
                else:
                    artists_val = entry_dict.get("artists")
                    if artists_val is not None:
                        artists = [str(a) for a in artists_val]

                track = YoutubeMusicTrack(
                    youtube_id=str(entry_dict.get("id", "")),
                    title=str(entry_dict.get("title", "")),
                    artists=artists,
                    album=str(entry_dict.get("album", "")),
                    duration_ms=duration_ms,
                    thumbnail_url=thumbnail,
                    isrc=entry_dict.get("isrc"),
                )
                tracks.append(track)

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to search tracks: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to search tracks: {e}",
            )

    @staticmethod
    async def get_track_info_async(
        youtube_id: str,
    ) -> AResult[YoutubeMusicTrack]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/watch?v={youtube_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Track not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            duration_ms = 0
            duration_val = info_dict.get("duration")
            if duration_val is not None:
                duration_ms = int(duration_val) * 1000

            thumbnail = str(info_dict.get("thumbnail", ""))

            artists: List[str] = []
            artist_val = info_dict.get("artist")
            if artist_val is not None:
                artists = [str(artist_val)]
            else:
                artists_val = info_dict.get("artists")
                if artists_val is not None:
                    artists = [str(a) for a in artists_val]

            album = str(info_dict.get("album", ""))
            album_youtube_id = info_dict.get("album_id")

            release_year: Optional[int] = None
            release_year_val = info_dict.get("release_year")
            if release_year_val is not None:
                release_year = int(release_year_val)

            track = YoutubeMusicTrack(
                youtube_id=youtube_id,
                title=str(info_dict.get("title", "")),
                artists=artists,
                album=album,
                album_youtube_id=album_youtube_id,
                duration_ms=duration_ms,
                thumbnail_url=thumbnail,
                isrc=info_dict.get("isrc"),
                release_year=release_year,
            )

            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track info: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track info: {e}",
            )

    @staticmethod
    async def get_album_info_async(
        youtube_id: str,
    ) -> AResult[YoutubeMusicAlbum]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/browse/{youtube_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Album not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            thumbnail = str(info_dict.get("thumbnail", ""))

            release_year: Optional[int] = None
            release_year_val = info_dict.get("release_year")
            if release_year_val is not None:
                release_year = int(release_year_val)

            artists: List[str] = []
            artist_val = info_dict.get("artist")
            if artist_val is not None:
                artists = [str(artist_val)]
            else:
                artists_val = info_dict.get("artists")
                if artists_val is not None:
                    artists = [str(a) for a in artists_val]

            album = YoutubeMusicAlbum(
                youtube_id=youtube_id,
                title=str(info_dict.get("title", "")),
                artists=artists,
                release_year=release_year,
                thumbnail_url=thumbnail,
            )

            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album info: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album info: {e}",
            )

    @staticmethod
    async def get_album_tracks_async(
        youtube_id: str,
    ) -> AResult[List[YoutubeMusicTrack]]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/browse/{youtube_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Album not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            entries = info_dict.get("tracks", [])
            if not entries:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            tracks: List[YoutubeMusicTrack] = []
            for entry in entries:
                entry_dict: Dict[str, Any] = cast(Dict[str, Any], entry)

                duration_ms = 0
                duration_val = entry_dict.get("duration_ms")
                if duration_val is not None:
                    duration_ms = int(duration_val)

                thumbnail = ""
                thumbnails = entry_dict.get("thumbnails")
                if thumbnails and len(thumbnails) > 0:
                    thumb = cast(Dict[str, Any], thumbnails[0])
                    thumb_url = cast(Optional[str], thumb.get("url"))
                    if thumb_url is not None:
                        thumbnail = thumb_url

                artists: List[str] = []
                artists_val = entry_dict.get("artists")
                if artists_val is not None:
                    artists = [str(a.get("name", "")) for a in artists_val]

                album = str(info_dict.get("title", ""))

                track = YoutubeMusicTrack(
                    youtube_id=str(entry_dict.get("videoId", "")),
                    title=str(entry_dict.get("title", "")),
                    artists=artists,
                    album=album,
                    duration_ms=duration_ms,
                    thumbnail_url=thumbnail,
                )
                tracks.append(track)

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to get album tracks: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album tracks: {e}",
            )

    @staticmethod
    async def get_artist_top_songs_async(
        youtube_id: str,
    ) -> AResult[List[YoutubeMusicTrack]]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/channel/{youtube_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Artist not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            entries = info_dict.get("tracks", [])
            if not entries:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            tracks: List[YoutubeMusicTrack] = []
            for entry in entries:
                entry_dict: Dict[str, Any] = cast(Dict[str, Any], entry)

                duration_ms = 0
                duration_val = entry_dict.get("duration_ms")
                if duration_val is not None:
                    duration_ms = int(duration_val)

                thumbnail = ""
                thumbnails = entry_dict.get("thumbnails")
                if thumbnails and len(thumbnails) > 0:
                    thumb = cast(Dict[str, Any], thumbnails[0])
                    thumb_url = cast(Optional[str], thumb.get("url"))
                    if thumb_url is not None:
                        thumbnail = thumb_url

                artists: List[str] = []
                artists_val = entry_dict.get("artists")
                if artists_val is not None:
                    artists = [str(a.get("name", "")) for a in artists_val]

                album = ""
                album_val = entry_dict.get("album")
                if album_val is not None:
                    album = str(album_val.get("name", ""))

                track = YoutubeMusicTrack(
                    youtube_id=str(entry_dict.get("videoId", "")),
                    title=str(entry_dict.get("title", "")),
                    artists=artists,
                    album=album,
                    duration_ms=duration_ms,
                    thumbnail_url=thumbnail,
                )
                tracks.append(track)

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to get artist top songs: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist top songs: {e}",
            )

    @staticmethod
    async def get_artist_info_async(
        youtube_id: str,
    ) -> AResult[YoutubeMusicArtist]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/channel/{youtube_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Artist not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            thumbnail = str(info_dict.get("thumbnail", ""))

            artist = YoutubeMusicArtist(
                youtube_id=youtube_id,
                name=str(info_dict.get("name", "")),
                thumbnail_url=thumbnail,
            )

            return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Failed to get artist info: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist info: {e}",
            )

    @staticmethod
    async def get_playlist_info_async(
        playlist_id: str,
    ) -> AResult[YoutubeMusicPlaylist]:
        try:
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
            }

            loop = None
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            def _get_info() -> Any:
                with _create_youtube_dl(ydl_opts) as ydl:
                    return ydl.extract_info(
                        f"https://music.youtube.com/playlist?list={playlist_id}",
                        download=False,
                    )

            info: Any = await loop.run_in_executor(None, _get_info)

            if not info:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Playlist not found",
                )

            info_dict: Dict[str, Any] = cast(Dict[str, Any], info)

            thumbnail = str(info_dict.get("thumbnail", ""))
            title = str(info_dict.get("title", ""))
            description = str(info_dict.get("description", ""))

            tracks: List[YoutubeMusicPlaylistTrack] = []
            entries = info_dict.get("entries", [])
            for entry in entries:
                entry_dict: Dict[str, Any] = cast(Dict[str, Any], entry)

                duration_ms = 0
                duration_val = entry_dict.get("duration")
                if duration_val is not None:
                    duration_ms = int(duration_val) * 1000

                thumbnail_track = ""
                thumbnails = entry_dict.get("thumbnails")
                if thumbnails and len(thumbnails) > 0:
                    thumb = cast(Dict[str, Any], thumbnails[-1])
                    thumb_url = cast(Optional[str], thumb.get("url"))
                    if thumb_url is not None:
                        thumbnail_track = thumb_url

                artists: List[str] = []
                artist_val = entry_dict.get("artist")
                if artist_val is not None:
                    artists = [str(artist_val)]
                else:
                    artists_val = entry_dict.get("artists")
                    if artists_val is not None:
                        artists = [str(a) for a in artists_val]

                album = str(entry_dict.get("album", ""))

                track = YoutubeMusicPlaylistTrack(
                    youtube_id=str(entry_dict.get("id", "")),
                    title=str(entry_dict.get("title", "")),
                    artists=artists,
                    album=album,
                    duration_ms=duration_ms,
                    thumbnail_url=thumbnail_track,
                )
                tracks.append(track)

            playlist = YoutubeMusicPlaylist(
                youtube_id=playlist_id,
                title=title,
                description=description,
                thumbnail_url=thumbnail,
                tracks=tracks,
            )

            return AResult(code=AResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            logger.error(f"Failed to get playlist info: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist info: {e}",
            )


youtube_music_api = YoutubeMusicApi()
