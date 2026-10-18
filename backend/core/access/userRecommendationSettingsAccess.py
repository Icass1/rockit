from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.userRecommendationSettings import (
    UserRecommendationSettingsRow,
)

logger = getLogger(__name__)


class UserRecommendationSettingsAccess:
    @staticmethod
    async def get_settings_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserRecommendationSettingsRow]:
        """The user's recommendation settings; NOT_FOUND when they never
        saved any (callers treat that as "external disabled")."""

        try:
            stmt = select(UserRecommendationSettingsRow).where(
                UserRecommendationSettingsRow.user_id == user_id
            )
            row: UserRecommendationSettingsRow | None = (
                await session.execute(stmt)
            ).scalar_one_or_none()
            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="No settings")
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(
                f"Error reading recommendation settings for user {user_id}: {e}",
                exc_info=True,
            )
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))

    @staticmethod
    async def upsert_settings_async(
        session: AsyncSession,
        user_id: int,
        external_enabled: bool,
        listenbrainz_username: str | None,
    ) -> AResult[UserRecommendationSettingsRow]:
        """Create or replace the user's recommendation settings."""

        try:
            stmt = (
                insert(UserRecommendationSettingsRow)
                .values(
                    user_id=user_id,
                    external_enabled=external_enabled,
                    listenbrainz_username=listenbrainz_username,
                )
                .on_conflict_do_update(
                    index_elements=[UserRecommendationSettingsRow.user_id],
                    set_={
                        "external_enabled": external_enabled,
                        "listenbrainz_username": listenbrainz_username,
                    },
                )
                .returning(UserRecommendationSettingsRow)
            )
            row: UserRecommendationSettingsRow = (
                await session.execute(
                    stmt, execution_options={"populate_existing": True}
                )
            ).scalar_one()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(
                f"Error saving recommendation settings for user {user_id}: {e}",
                exc_info=True,
            )
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))
