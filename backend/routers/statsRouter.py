from fastapi import APIRouter, Depends
from typing import List, Sequence, Tuple
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.sql.expression import func

from backend.init import rockit_db
from backend.utils.auth import get_current_user
from backend.responses.general.songWithAlbum import RockItSongWithAlbumResponse

from backend.db.ormModels.main.song import SongRow
from backend.db.ormModels.main.user import UserRow

from backend.db.associationTables.user_history_songs import user_history_songs

from backend.responses.stats.homeStatsResponse import HomeStatsResponse


router = APIRouter(prefix="/stats")


def get_response_songs_list(songs:  Sequence[Tuple[SongRow, datetime]]) -> List[RockItSongWithAlbumResponse]:
    out: List[RockItSongWithAlbumResponse] = []

    for song, played_at in songs:
        out.append(
            RockItSongWithAlbumResponse.from_row(song)
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
