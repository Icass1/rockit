import os
import json
from typing import Any, List, cast
from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.requests.uploadSongRequest import UploadSongRequest
from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest

from backend.core.responses.uploadResponse import UploadResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

from backend.core.framework import providers
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.provider.baseUploadProvider import BaseUploadProvider

from backend.core.access.mediaAccess import MediaAccess

from backend.rockit.access.rockitAccess import RockitAccess
from backend.rockit.access.db.ormModels.song import RockitSongRow

logger: Logger = getLogger(__name__)

router = APIRouter(prefix="/rockit", tags=["rockit"])


@router.post("/upload/song", response_model=UploadResponse)
async def upload_rockit_song(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    artistName: str = Form(...),
    _=Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload a song file to the RockIt provider."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    provider: BaseUploadProvider | None = _get_rockit_upload_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt upload provider not found")

    file_data: bytes = await file.read()

    upload_request: UploadSongRequest = UploadSongRequest(
        title=title,
        artistName=[artistName],
        fileSize=len(file_data),
    )

    a_result: AResult[UploadResponse] = await provider.upload_song_async(
        session=session,
        request=upload_request,
        file_data=file_data,
    )

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return a_result.result()


@router.post("/upload/album", response_model=UploadResponse)
async def upload_rockit_album(
    request: Request,
    _=Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload an album with songs to the RockIt provider.

    Accepts multipart form data with:
    - metadata: JSON string with title, artistName, songs[{title, fileSize}]
    - cover: optional cover image file
    - {index}_song: song files named by index (0_song, 1_song, ...)
    """

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    provider: BaseUploadProvider | None = _get_rockit_upload_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt upload provider not found")

    form = await request.form()

    raw_metadata = form.get("metadata")
    if not isinstance(raw_metadata, str) or not raw_metadata:
        raise HTTPException(status_code=400, detail="Missing metadata field")

    try:
        metadata: dict[str, Any] = json.loads(raw_metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    title = str(metadata.get("title", "Unknown Album"))
    raw_artists = metadata.get("artistName", ["Unknown Artist"])
    if isinstance(raw_artists, list):
        artist_names: list[str] = [str(a) for a in cast(list[Any], raw_artists)]
    else:
        artist_names = [str(raw_artists)]
    raw_songs = metadata.get("songs", [])
    if isinstance(raw_songs, list):
        songs_meta: list[dict[str, Any]] = [
            cast(dict[str, Any], s) for s in cast(list[Any], raw_songs)
        ]
    else:
        songs_meta = []

    raw_cover = form.get("cover")
    cover_file: UploadFile | None = (
        raw_cover if isinstance(raw_cover, UploadFile) else None
    )
    cover_data: bytes | None = None
    if cover_file is not None:
        cover_data = await cover_file.read()

    song_files: dict[str, bytes] = {}
    for i, song_meta in enumerate(songs_meta):
        song_title: str = str(song_meta.get("title", f"Track {i + 1}"))
        field_name: str = f"{i}_song"
        raw_song_file = form.get(field_name)
        song_file: UploadFile | None = (
            raw_song_file if isinstance(raw_song_file, UploadFile) else None
        )
        if song_file is not None:
            song_files[song_title] = await song_file.read()

    song_requests: list[UploadSongRequest] = [
        UploadSongRequest(
            title=str(s.get("title", f"Track {idx + 1}")),
            artistName=artist_names,
            fileSize=0,
        )
        for idx, s in enumerate(songs_meta)
    ]

    upload_request: UploadAlbumRequest = UploadAlbumRequest(
        title=title,
        artistName=artist_names,
        songs=song_requests,
    )

    a_result: AResult[UploadResponse] = await provider.upload_album_async(
        session=session,
        request=upload_request,
        cover_data=cover_data,
        song_files=song_files,
    )

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return a_result.result()


@router.get("/song/{public_id}", response_model=BaseSongWithAlbumResponse)
async def get_rockit_song(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BaseSongWithAlbumResponse:
    """Get a RockIt song by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: AResult[List[BaseSongWithAlbumResponse]] = await provider.get_songs_async(
        session=session, public_ids=[public_id]
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    songs: List[BaseSongWithAlbumResponse] = a_result.result()
    if not songs:
        raise HTTPException(status_code=404, detail="Song not found")

    return songs[0]


@router.get("/album/{public_id}", response_model=BaseAlbumWithSongsResponse)
async def get_rockit_album(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BaseAlbumWithSongsResponse:
    """Get a RockIt album by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: AResult[List[BaseAlbumWithSongsResponse]] = (
        await provider.get_albums_async(session=session, public_ids=[public_id])
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    albums: List[BaseAlbumWithSongsResponse] = a_result.result()
    if not albums:
        raise HTTPException(status_code=404, detail="Album not found")

    return albums[0]


@router.get("/audio/{public_id}")
async def serve_rockit_audio(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
):
    """Serve an uploaded audio file."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_media: AResult[CoreMediaRow] = (
        await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
    )
    if a_result_media.is_not_ok():
        raise HTTPException(status_code=404, detail="Media not found")

    media: CoreMediaRow = a_result_media.result()

    a_result_songs: AResult[List[RockitSongRow]] = await RockitAccess.get_songs_async(
        session=session, song_ids=[media.id]
    )
    if a_result_songs.is_not_ok() or not a_result_songs.result():
        raise HTTPException(status_code=404, detail="Song not found")

    song: RockitSongRow = a_result_songs.result()[0]
    if not song.file_path or not os.path.exists(song.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=song.file_path,
        media_type="audio/mpeg",
        filename=f"{song.name}.mp3",
    )


def _get_rockit_media_provider() -> BaseMediaProvider | None:
    """Find the RockIt media provider instance."""

    for p in providers.get_media_providers():
        if p.get_name() == "RockIt":
            return p
    return None


def _get_rockit_upload_provider() -> BaseUploadProvider | None:
    """Find the RockIt upload provider instance."""

    for p in providers.get_upload_providers():
        if p.get_name() == "RockIt":
            return p
    return None
