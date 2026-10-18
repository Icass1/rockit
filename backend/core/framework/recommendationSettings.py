from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.userRecommendationSettingsAccess import (
    UserRecommendationSettingsAccess,
)
from backend.core.framework.externalRecommendation.externalRecommendations import (
    external_recommendations,
)
from backend.core.framework.externalRecommendation.listenBrainzProvider import (
    LISTENBRAINZ_MAX_USERNAME_LENGTH,
    ListenBrainzProvider,
)
from backend.core.responses.recommendationSettingsResponse import (
    RecommendationSettingsResponse,
)

logger = getLogger(__name__)


class RecommendationSettings:
    @staticmethod
    async def get_settings_async(
        session: AsyncSession, user_id: int
    ) -> AResult[RecommendationSettingsResponse]:
        """The user's recommendation settings; defaults (external disabled)
        when they never saved any."""

        a_settings = await UserRecommendationSettingsAccess.get_settings_async(
            session=session, user_id=user_id
        )
        if a_settings.is_not_ok() and a_settings.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error reading recommendation settings. {a_settings.info()}")
            return AResult(code=a_settings.code(), message=a_settings.message())

        row = a_settings.result() if a_settings.is_ok() else None
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationSettingsResponse(
                externalEnabled=bool(row.external_enabled) if row else False,
                listenbrainzUsername=row.listenbrainz_username if row else None,
                availableProviders=external_recommendations.configured_provider_names(),
            ),
        )

    @staticmethod
    async def update_settings_async(
        session: AsyncSession,
        user_id: int,
        external_enabled: bool,
        listenbrainz_username: str | None,
    ) -> AResult[RecommendationSettingsResponse]:
        """Validate and save the user's recommendation settings."""

        username = ListenBrainzProvider.normalize_username(listenbrainz_username)
        if username is not None and not ListenBrainzProvider.is_valid_username(
            username
        ):
            logger.warning(f"Rejected invalid ListenBrainz username for user {user_id}")
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message=(
                    "Invalid ListenBrainz username: use your public ListenBrainz "
                    f"username (at most {LISTENBRAINZ_MAX_USERNAME_LENGTH} "
                    "characters, no slashes)."
                ),
            )

        a_saved = await UserRecommendationSettingsAccess.upsert_settings_async(
            session=session,
            user_id=user_id,
            external_enabled=external_enabled,
            listenbrainz_username=username,
        )
        if a_saved.is_not_ok():
            logger.error(f"Error saving recommendation settings. {a_saved.info()}")
            return AResult(code=a_saved.code(), message=a_saved.message())

        return await RecommendationSettings.get_settings_async(
            session=session, user_id=user_id
        )
