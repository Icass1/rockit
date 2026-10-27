from logging import Logger

from sqlalchemy import DBResult, Select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.access.db.ormModels.language import LanguageRow
from core.aResult import AResult, AResultCode
from logger import getLogger

logger: Logger = getLogger(__name__)


class LanguageAccess:
    @staticmethod
    async def get_language_from_id(session: AsyncSession, lang_id: int) -> AResult[LanguageRow]:
        try:
            result: LanguageRow | None = await session.get(entity=LanguageRow, ident=lang_id)

            if not result:
                logger.error(f"Language id {lang_id} not found.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Language id {lang_id} not found.",
                )

            return AResult(code=AResultCode.OK, message="OK", result=result)

        except Exception as e:
            logger.error(f"Error in get_language_from_id: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get language: {e}",
            )

    @staticmethod
    async def get_language_from_code(session: AsyncSession, lang_code: str) -> AResult[LanguageRow]:
        try:
            stmt: Select[tuple[LanguageRow]] = select(LanguageRow).where(
                LanguageRow.lang_code == lang_code
            )
            result: DBResult[tuple[LanguageRow]] = await session.execute(statement=stmt)

            language: LanguageRow | None = result.scalar_one_or_none()

            if not language:
                logger.error(f"Language code {lang_code} not found")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Language code {lang_code} not found",
                )

            return AResult(code=AResultCode.OK, message="OK", result=language)

        except Exception as e:
            logger.error(f"Error in get_language_from_code: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get language: {e}",
            )

    @staticmethod
    async def get_all_languages(
        session: AsyncSession,
    ) -> AResult[list[LanguageRow]]:
        try:
            stmt: Select[tuple[LanguageRow]] = select(LanguageRow)
            result: DBResult[tuple[LanguageRow]] = await session.execute(statement=stmt)

            languages: list[LanguageRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=languages)

        except Exception as e:
            logger.error(f"Error in get_all_languages: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get languages: {e}",
            )

    @staticmethod
    async def create_language(
        session: AsyncSession, lang_code: str, language: str
    ) -> AResult[LanguageRow]:
        """Create a new language."""
        try:
            new_language = LanguageRow(
                lang_code=lang_code,
                language=language,
            )

            session.add(instance=new_language)

            return AResult(code=AResultCode.OK, message="OK", result=new_language)

        except Exception as e:
            logger.error(f"Error in create_language: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to create language: {e}",
            )

    @staticmethod
    async def get_or_create_language(
        session: AsyncSession, lang_code: str, language: str
    ) -> AResult[LanguageRow]:
        try:
            existing = await LanguageAccess.get_language_from_code(
                session=session, lang_code=lang_code
            )
            if existing.is_ok():
                return existing

            return await LanguageAccess.create_language(
                session=session, lang_code=lang_code, language=language
            )

        except Exception as e:
            logger.error(f"Error in get_or_create_language: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get or create language: {e}",
            )
