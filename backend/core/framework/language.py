from typing import List
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.access.languageAccess import LanguageAccess
from backend.core.access.db.ormModels.language import LanguageRow

logger: Logger = getLogger(__name__)


class Language:
    @staticmethod
    async def get_all_languages(
        session: AsyncSession,
    ) -> AResult[List[LanguageRow]]:
        """Get all available languages."""

        a_result_languages: AResult[List[LanguageRow]] = (
            await LanguageAccess.get_all_languages(session=session)
        )

        if a_result_languages.is_not_ok():
            logger.error(f"Error getting languages. {a_result_languages.info()}")
            return AResult(
                code=a_result_languages.code(), message=a_result_languages.message()
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=a_result_languages.result(),
        )

    @staticmethod
    async def get_or_create_language(
        session: AsyncSession, lang_code: str, language: str
    ) -> AResult[LanguageRow]:
        """Get or create a language."""

        a_result_language: AResult[LanguageRow] = (
            await LanguageAccess.get_or_create_language(
                session=session, lang_code=lang_code, language=language
            )
        )

        if a_result_language.is_not_ok():
            logger.error(
                f"Error getting or creating language. {a_result_language.info()}"
            )
            return AResult(
                code=a_result_language.code(), message=a_result_language.message()
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=a_result_language.result(),
        )
