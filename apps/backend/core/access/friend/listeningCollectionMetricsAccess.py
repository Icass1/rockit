"""Batch aggregates for the additional recorded-habit and collection families."""

from typing import Any

from sqlalchemy import extract, func, literal, select, tuple_, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.ormModels.friend.sharedMedia import SharedMediaRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


def history_metrics_statement(user_ids: list[int]) -> Select[tuple[Any, ...]]:
    """Calendar diversity and rotation share one statement, never one query per badge."""
    history = (
        select(
            UserMediaListenedRow.user_id,
            UserMediaListenedRow.media_id,
            func.timezone("UTC", UserMediaListenedRow.date_added).label("played_at"),
        )
        .where(UserMediaListenedRow.user_id.in_(user_ids))
        .cte("emblem_history")
    )
    hour = extract("hour", history.c.played_at)
    weekday = extract("isodow", history.c.played_at)
    month = extract("month", history.c.played_at)
    day = extract("day", history.c.played_at)
    windows = {
        "morning": (hour >= 9) & (hour < 12),
        "midday": (hour >= 12) & (hour < 15),
        "afternoon": (hour >= 15) & (hour < 19),
        "evening": (hour >= 19) & (hour < 24),
        **{
            name: weekday == index
            for index, name in enumerate(
                ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"), 1
            )
        },
        "winter": month.in_([12, 1, 2]),
        "spring": month.in_([3, 4, 5]),
        "summer": month.in_([6, 7, 8]),
        "autumn": month.in_([9, 10, 11]),
        "new_year": (month == 1) & (day == 1),
        "leap_day": (month == 2) & (day == 29),
        "music_day": (month == 6) & (day == 21),
        "halloween": (month == 10) & (day == 31),
        "year_end": (month == 12) & (day == 31),
    }
    periods = {
        "months_active": func.date_trunc("month", history.c.played_at),
        "years_active": extract("year", history.c.played_at),
        "weeks_active": func.date_trunc("week", history.c.played_at),
        "all_hours": hour,
        "all_weekdays": weekday,
        "music_months": month,
    }
    habits = (
        select(
            history.c.user_id,
            *(func.count().filter(condition).label(name) for name, condition in windows.items()),
            *(func.count(func.distinct(period)).label(name) for name, period in periods.items()),
        )
        .group_by(history.c.user_id)
        .subquery("habits")
    )
    counts = (
        select(history.c.user_id, history.c.media_id, func.count().label("plays"))
        .group_by(history.c.user_id, history.c.media_id)
        .subquery("recording_counts")
    )
    rotation = (
        select(
            counts.c.user_id,
            func.max(counts.c.plays).label("repeats"),
            func.count().filter(counts.c.plays >= 10).label("favorites"),
            func.count().filter(counts.c.plays >= 50).label("deep_rotation"),
        )
        .group_by(counts.c.user_id)
        .subquery("rotation")
    )
    return select(
        habits,
        rotation.c.repeats,
        rotation.c.favorites,
        rotation.c.deep_rotation,
    ).join(rotation, rotation.c.user_id == habits.c.user_id)


def library_metrics_statement(user_ids: list[int]) -> Select[tuple[Any, ...]]:
    """Count current saved items once, respecting the library's unique item constraint."""
    kinds = {
        "library_songs": MediaTypeEnum.SONG,
        "library_albums": MediaTypeEnum.ALBUM,
        "library_artists": MediaTypeEnum.ARTIST,
        "library_playlists": MediaTypeEnum.PLAYLIST,
        "library_radios": MediaTypeEnum.RADIO,
        "library_videos": MediaTypeEnum.VIDEO,
    }
    return (
        select(
            UserLibraryMediaRow.user_id,
            *(
                func.count().filter(CoreMediaRow.media_type_key == kind.value).label(name)
                for name, kind in kinds.items()
            ),
            func.count().label("library_total"),
            func.count(func.distinct(CoreMediaRow.media_type_key)).label("library_diversity"),
        )
        .join(CoreMediaRow, CoreMediaRow.id == UserLibraryMediaRow.media_id)
        .where(UserLibraryMediaRow.user_id.in_(user_ids))
        .group_by(UserLibraryMediaRow.user_id)
    )


def sharing_metrics_statement(user_ids: list[int]) -> Select[tuple[Any, ...]]:
    """Outgoing and incoming unique recommendations remain independently user-scoped."""
    edges = union_all(
        select(
            SharedMediaRow.sender_user_id.label("user_id"),
            SharedMediaRow.recipient_user_id.label("peer_id"),
            SharedMediaRow.media_id,
            SharedMediaRow.date_added,
            literal(True).label("outgoing"),
        ).where(SharedMediaRow.sender_user_id.in_(user_ids)),
        select(
            SharedMediaRow.recipient_user_id.label("user_id"),
            SharedMediaRow.sender_user_id.label("peer_id"),
            SharedMediaRow.media_id,
            SharedMediaRow.date_added,
            literal(False).label("outgoing"),
        ).where(SharedMediaRow.recipient_user_id.in_(user_ids)),
    ).subquery("recommendation_edges")
    outgoing = edges.c.outgoing.is_(True)
    incoming = edges.c.outgoing.is_(False)
    pair = tuple_(edges.c.peer_id, edges.c.media_id)
    kinds = {
        "album_shares": MediaTypeEnum.ALBUM,
        "artist_shares": MediaTypeEnum.ARTIST,
        "playlist_shares": MediaTypeEnum.PLAYLIST,
        "radio_shares": MediaTypeEnum.RADIO,
        "video_shares": MediaTypeEnum.VIDEO,
        "song_shares": MediaTypeEnum.SONG,
    }
    return (
        select(
            edges.c.user_id,
            func.count(func.distinct(edges.c.peer_id)).filter(outgoing).label("share_reach"),
            func.count(func.distinct(edges.c.media_id))
            .filter(outgoing)
            .label("shared_discoveries"),
            func.count(func.distinct(pair)).filter(incoming).label("recommendations_received"),
            func.count(func.distinct(edges.c.peer_id)).filter(incoming).label("curators"),
            func.count(func.distinct(func.date(func.timezone("UTC", edges.c.date_added))))
            .filter(outgoing)
            .label("sharing_days"),
            *(
                func.count(func.distinct(pair))
                .filter(outgoing & (CoreMediaRow.media_type_key == kind.value))
                .label(name)
                for name, kind in kinds.items()
            ),
        )
        .join(CoreMediaRow, CoreMediaRow.id == edges.c.media_id)
        .group_by(edges.c.user_id)
    )


class ListeningCollectionMetricsAccess:
    @staticmethod
    @safe_async
    async def get_async(
        session: AsyncSession, user_ids: list[int]
    ) -> Result[dict[int, dict[str, int]]]:
        """Three fixed batch queries for 48 counters, with zeros for empty histories."""
        metrics: dict[int, dict[str, int]] = {user_id: {} for user_id in user_ids}
        if not user_ids:
            return Result(code=ResultCode.OK, message="OK", result=metrics)
        for statement in (
            history_metrics_statement(user_ids=user_ids),
            library_metrics_statement(user_ids=user_ids),
            sharing_metrics_statement(user_ids=user_ids),
        ):
            rows = await session.execute(statement)
            for row in rows.mappings():
                user_id = int(row["user_id"])
                metrics[user_id].update(
                    {str(name): int(value or 0) for name, value in row.items() if name != "user_id"}
                )
        return Result(code=ResultCode.OK, message="OK", result=metrics)
