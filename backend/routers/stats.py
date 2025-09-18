from datetime import UTC, datetime, timedelta
from typing import List, Sequence, Tuple
from fastapi import APIRouter, Depends

from sqlalchemy import select
from sqlalchemy.sql.expression import func

from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.utils.auth import get_current_user
from backend.initDb import rockit_db

from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.user import UserRow

from backend.db.associationTables.user_history_songs import user_history_songs

from backend.responses.general.album import RockItAlbumResponse
from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.copyright import RockItCopyrightResponse
from backend.responses.general.song import RockItSongResponse
from backend.responses.stats.homeStatsResponse import HomeStatsResponse


router = APIRouter(prefix="/stats")


def get_response_songs_list(songs:  Sequence[Tuple[SongRow, datetime]]) -> List[RockItSongResponse]:
    out: List[RockItSongResponse] = []
    for song, played_at in songs:
        out.append(
            RockItSongResponse(
                name=song.name,
                publicId=song.public_id,
                internalImageUrl=f"http://localhost:8000/image/{song.internal_image.public_id}" if song.internal_image else None,
                duration=song.duration,
                trackNumber=song.track_number,
                downloadUrl=song.download_url,
                popularity=song.popularity,
                dateAdded=song.date_added,
                discNumber=song.disc_number,
                isrc=song.isrc,
                album=RockItAlbumResponse(
                    publicId=song.album.public_id,
                    name=song.album.name,
                    copyrights=[
                        RockItCopyrightResponse(
                            text=a.text,
                            type=a.type
                        ) for a in song.album.copyrights],
                    externalImages=[
                        RockItExternalImageResponse(
                            url=a.url,
                            width=a.width,
                            height=a.height
                        ) for a in song.album.external_images]
                ),
                artists=[
                    RockItArtistResponse(
                        name=artist.name,
                        publicId=artist.public_id,
                        genres=[a.name for a in artist.genres]
                    ) for artist in song.artists
                ]
            )
        )

    return out


@router.get("")
def stats(current_user: UserRow = Depends(get_current_user)):
    return []


@router.get("/home")
def home_stats(current_user: UserRow = Depends(get_current_user)) -> HomeStatsResponse:
    with rockit_db.session_scope() as s:

        # Get 40 last played songs.
        subq = (
            select(
                user_history_songs.c.song_id,
                func.max(user_history_songs.c.played_at).label(
                    "latest_played_at")
            )
            .where(user_history_songs.c.user_id == current_user.id)
            .group_by(user_history_songs.c.song_id)
            .subquery()
        )

        songs_by_time_played: Sequence[Tuple[SongRow, datetime]] = (
            s.execute(
                select(SongRow, subq.c.latest_played_at)
                .join(subq, subq.c.song_id == SongRow.id)
                .order_by(subq.c.latest_played_at.desc())
                .limit(40)
            )
            .tuples()
            .all()
        )

        # Get 40 randomly selected songs from the past 30 days.
        subq = (
            select(
                user_history_songs.c.song_id,
                func.max(user_history_songs.c.played_at).label(
                    "latest_played_at")
            )
            .where(user_history_songs.c.user_id == current_user.id)
            .where(user_history_songs.c.played_at > datetime.now(UTC) - timedelta(days=30))
            .group_by(user_history_songs.c.song_id)
            .subquery()
        )

        random_songs_last_month: Sequence[Tuple[SongRow, datetime]] = (
            s.execute(
                select(SongRow, subq.c.latest_played_at)
                .join(subq, subq.c.song_id == SongRow.id)
                .order_by(subq.c.latest_played_at.desc())
                .limit(40)
            )
            .tuples()
            .all()
        )

        subq = (
            select(
                user_history_songs.c.song_id,
                func.max(user_history_songs.c.played_at).label(
                    "latest_played_at")
            )
            .where(user_history_songs.c.user_id == current_user.id)
            .where(user_history_songs.c.played_at < datetime.now(UTC) - timedelta(days=30))
            .where(user_history_songs.c.played_at > datetime.now(UTC) - timedelta(days=365))
            .group_by(user_history_songs.c.song_id)
            .subquery()
        )

        hidden_gems: Sequence[Tuple[SongRow, datetime]] = (
            s.execute(
                select(SongRow, subq.c.latest_played_at)
                .join(subq, subq.c.song_id == SongRow.id)
                .order_by(subq.c.latest_played_at.desc())
                .limit(40)
            )
            .tuples()
            .all()
        )

        return HomeStatsResponse(
            songsByTimePlayed=get_response_songs_list(
                songs=songs_by_time_played),
            randomSongsLastMonth=get_response_songs_list(
                songs=random_songs_last_month),
            nostalgicMix=[],
            hiddenGems=get_response_songs_list(
                songs=hidden_gems),
            communityTop=[],
            monthlyTop=[],
            moodSongs=[]
        )
