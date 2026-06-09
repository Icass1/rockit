import time as time_module
from typing import Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.user.user import User
from backend.core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow,
)
from backend.core.framework.websocket.playbackState import (
    FLUSH_INTERVAL_SECONDS,
    LISTENED_THRESHOLD_PERCENT,
    UserPlaybackState,
)
from backend.core.framework.websocket.sendToUser import SendToUser
from backend.core.responses.mediaListenedMessage import MediaListenedMessage

logger = getLogger(__name__)


async def close_listen_interval_async(
    session: AsyncSession,
    user_id: int,
    playback_state: UserPlaybackState,
    time_ms_end: int,
) -> None:
    """Close the current listen interval by recording it to the DB."""

    if (
        playback_state.active_interval_start_ms is None
        or playback_state.active_interval_media_id is None
    ):
        logger.debug("Nothing to do")
        return

    if time_ms_end <= playback_state.active_interval_start_ms:
        logger.debug(
            f"Skipping zero/negative-duration interval media={playback_state.active_interval_media_id} "
            f"start={playback_state.active_interval_start_ms}ms end={time_ms_end}ms"
        )
        playback_state.active_interval_start_ms = None
        playback_state.active_interval_media_id = None
        return

    if playback_state.active_interval_db_id is not None:
        logger.debug("Updating media listen interval.")
        a_result_update: AResultCode = (
            await User.update_media_listen_interval_end_async(
                session=session,
                interval_id=playback_state.active_interval_db_id,
                time_ms_end=time_ms_end,
            )
        )
        if a_result_update.is_not_ok():
            logger.error(f"Error finalising listen interval. {a_result_update.info()}")
        else:
            logger.debug(
                f"Finalised listen interval db_id={playback_state.active_interval_db_id} "
                f"end={time_ms_end}ms"
            )
    else:
        logger.debug("Creating new media listen interval.")
        a_result_insert_close: AResult[UserMediaListenIntervalRow] = (
            await User.record_media_listen_interval_async(
                session=session,
                user_id=user_id,
                media_id=playback_state.active_interval_media_id,
                time_ms_start=playback_state.active_interval_start_ms,
                time_ms_end=time_ms_end,
            )
        )
        if a_result_insert_close.is_not_ok():
            logger.error(
                f"Error recording listen interval. {a_result_insert_close.info()}"
            )
        else:
            logger.debug(
                f"Recorded listen interval media={playback_state.active_interval_media_id} "
                f"start={playback_state.active_interval_start_ms}ms end={time_ms_end}ms"
            )

    playback_state.active_interval_start_ms = None
    playback_state.active_interval_media_id = None
    playback_state.active_interval_db_id = None
    playback_state.active_interval_start_timestamp = None
    playback_state.active_interval_last_flush_timestamp = None


async def start_listen_interval_async(
    session: AsyncSession,
    user_id: int,
    media_public_id: str,
    time_ms_start: int,
    playback_state: UserPlaybackState,
) -> None:
    """Start tracking a new listen interval in state (no DB write yet)."""

    a_result_media: AResult[MediaModel] = await Media.get_media_from_public_id_async(
        session=session,
        public_id=media_public_id,
        media_type_keys=None,
    )
    if a_result_media.is_not_ok():
        logger.error(f"Error getting media for interval start. {a_result_media.info()}")
        return

    playback_state.active_interval_start_ms = time_ms_start
    playback_state.active_interval_media_id = a_result_media.result().id
    playback_state.active_interval_db_id = None
    playback_state.active_interval_start_timestamp = time_module.time()
    playback_state.active_interval_last_flush_timestamp = None
    logger.debug(
        f"Tracking listen interval for media {media_public_id} from {time_ms_start}ms"
    )


async def check_and_record_listen_threshold_async(
    user_id: int,
    media_public_id: str,
    current_time: int,
    is_new_media: bool,
    time_diff_ms: int,
    playback_state: UserPlaybackState,
) -> None:
    if playback_state.has_reached_listen_threshold:
        logger.debug(
            f"[threshold_check] user={user_id} media={media_public_id} — "
            f"already marked as listened, skipping check"
        )
        return

    if not media_public_id:
        logger.debug(
            f"[threshold_check] user={user_id} — no media_public_id, skipping check"
        )
        return

    # logger.debug(
    #     f"[threshold_check] user={user_id} media={media_public_id} "
    #     f"(is_new_media={is_new_media}, time_diff_ms={time_diff_ms})"
    # )

    async with rockit_db.session_scope_async() as duration_session:
        a_result_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=duration_session,
                public_ids=[media_public_id],
                media_type_keys=None,
            )
        )

        if a_result_medias.is_not_ok() or not a_result_medias.result():
            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} — "
                f"could not fetch media record, skipping"
            )
            return

        media_item: MediaModel = a_result_medias.result()[0]
        provider = providers.find_media_provider(media_item.provider_id)

        if not provider:
            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} — "
                f"no provider found for provider_id={media_item.provider_id}, skipping"
            )
            return

        a_result_duration: AResult[int] = await provider.get_media_duration_ms_async(
            session=duration_session,
            public_id=media_public_id,
        )

        if a_result_duration.is_not_ok():
            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} — "
                f"could not fetch duration, skipping"
            )
            return

        duration_ms: int = a_result_duration.result()

        if duration_ms <= 0:
            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} — "
                f"invalid duration={duration_ms}, skipping"
            )
            return

        percent_listened = current_time / duration_ms
        threshold_ms = duration_ms * LISTENED_THRESHOLD_PERCENT

        # logger.debug(
        #     f"[threshold_check] user={user_id} media={media_public_id} "
        #     f"current_time_ms={current_time} duration_ms={duration_ms} "
        #     f"percent_listened={percent_listened:.1%} threshold={LISTENED_THRESHOLD_PERCENT:.0%} "
        #     f"threshold_ms={threshold_ms:.0f} reached={current_time >= threshold_ms}"
        # )

        if current_time < threshold_ms:
            return

        logger.info(
            f"User {user_id} listened to {percent_listened:.1%} of media {media_public_id} "
            f"(threshold: {LISTENED_THRESHOLD_PERCENT:.0%}) — recording listen"
        )
        playback_state.has_reached_listen_threshold = True

        a_result_listened: AResult[bool] = await User.add_user_media_listened_async(
            session=duration_session,
            user_id=user_id,
            media_id=media_item.id,
        )
        if a_result_listened.is_not_ok():
            logger.error(
                f"Error adding user media listened for user {user_id}. {a_result_listened.info()}"
            )
        else:
            await SendToUser.send_to_user(
                user_id=user_id,
                message=MediaListenedMessage(publicId=media_public_id),
            )


async def close_listen_interval_on_disconnect_async(
    user_id: int,
    user_playback_states: Dict[int, UserPlaybackState],
) -> None:
    """Close the active listen interval when a user fully disconnects."""

    playback_state = user_playback_states.get(user_id)
    logger.debug(f"Closing interval on disconnect {playback_state}")
    if playback_state and playback_state.active_interval_start_ms is not None:
        async with rockit_db.session_scope_async() as session:
            await close_listen_interval_async(
                session=session,
                user_id=user_id,
                playback_state=playback_state,
                time_ms_end=playback_state.last_time_ms,
            )


async def maybe_flush_listen_interval_async(
    session: AsyncSession,
    user_id: int,
    playback_state: UserPlaybackState,
    current_time_ms: int,
) -> None:
    """Insert or update the open interval in the DB every FLUSH_INTERVAL_SECONDS."""

    if (
        playback_state.active_interval_start_ms is None
        or playback_state.active_interval_media_id is None
        or playback_state.active_interval_start_timestamp is None
    ):
        return

    now = time_module.time()

    if playback_state.active_interval_db_id is None:
        elapsed = now - playback_state.active_interval_start_timestamp
        if elapsed < FLUSH_INTERVAL_SECONDS:
            return

        a_result_insert: AResult[UserMediaListenIntervalRow] = (
            await User.record_media_listen_interval_async(
                session=session,
                user_id=user_id,
                media_id=playback_state.active_interval_media_id,
                time_ms_start=playback_state.active_interval_start_ms,
                time_ms_end=current_time_ms,
            )
        )
        if a_result_insert.is_not_ok():
            logger.error(f"Error flushing listen interval. {a_result_insert.info()}")
            return

        playback_state.active_interval_db_id = a_result_insert.result().id
        playback_state.active_interval_last_flush_timestamp = now
        logger.debug(
            f"Flushed open interval to DB for user={user_id} "
            f"db_id={playback_state.active_interval_db_id} end={current_time_ms}ms"
        )
    else:
        if (
            playback_state.active_interval_last_flush_timestamp is None
            or now - playback_state.active_interval_last_flush_timestamp
            < FLUSH_INTERVAL_SECONDS
        ):
            return

        a_result_update: AResultCode = (
            await User.update_media_listen_interval_end_async(
                session=session,
                interval_id=playback_state.active_interval_db_id,
                time_ms_end=current_time_ms,
            )
        )
        if a_result_update.is_not_ok():
            logger.error(f"Error updating open interval end. {a_result_update.info()}")
            return

        playback_state.active_interval_last_flush_timestamp = now
        logger.debug(
            f"Updated open interval end for user={user_id} "
            f"db_id={playback_state.active_interval_db_id} end={current_time_ms}ms"
        )
