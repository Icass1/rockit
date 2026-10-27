from logging import Logger

from sqlalchemy import Result as DBResult, Select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.access.db.ormModels.vocabulary import VocabularyRow
from core.aResult import AResult, AResultCode
from logger import getLogger

logger: Logger = getLogger(__name__)


class VocabularyAccess:
    @staticmethod
    async def get_vocabulary_by_lang_id(
        session: AsyncSession, lang_id: int
    ) -> AResult[list[VocabularyRow]]:
        try:
            stmt: Select[tuple[VocabularyRow]] = select(VocabularyRow).where(
                VocabularyRow.lang_id == lang_id
            )
            result: DBResult[tuple[VocabularyRow]] = await session.execute(statement=stmt)

            vocabulary: list[VocabularyRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=vocabulary)

        except Exception as e:
            logger.error(f"Error in get_vocabulary_by_lang_id: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get vocabulary: {e}",
            )

    @staticmethod
    async def get_vocabulary_dict_by_lang_id(
        session: AsyncSession, lang_id: int
    ) -> AResult[dict[str, str]]:
        try:
            a_result_vocabulary = await VocabularyAccess.get_vocabulary_by_lang_id(
                session=session, lang_id=lang_id
            )
            if a_result_vocabulary.is_not_ok():
                return AResult(
                    code=a_result_vocabulary.code(),
                    message=a_result_vocabulary.message(),
                )

            vocabulary_dict: dict[str, str] = {v.key: v.value for v in a_result_vocabulary.result()}

            return AResult(code=AResultCode.OK, message="OK", result=vocabulary_dict)

        except Exception as e:
            logger.error(f"Error in get_vocabulary_dict_by_lang_id: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get vocabulary: {e}",
            )

    @staticmethod
    async def upsert_vocabulary(
        session: AsyncSession, key: str, lang_id: int, value: str
    ) -> AResult[VocabularyRow]:
        try:
            stmt: Select[tuple[VocabularyRow]] = select(VocabularyRow).where(
                VocabularyRow.key == key,
                VocabularyRow.lang_id == lang_id,
            )
            result: DBResult[tuple[VocabularyRow]] = await session.execute(statement=stmt)
            existing: VocabularyRow | None = result.scalar_one_or_none()

            if existing:
                existing.value = value
                await session.flush()
                await session.refresh(instance=existing)
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            new_vocabulary = VocabularyRow(
                key=key,
                lang_id=lang_id,
                value=value,
            )

            session.add(instance=new_vocabulary)
            await session.flush()
            await session.refresh(instance=new_vocabulary)

            return AResult(code=AResultCode.OK, message="OK", result=new_vocabulary)

        except Exception as e:
            logger.error(f"Error in upsert_vocabulary: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to upsert vocabulary: {e}",
            )

    @staticmethod
    async def delete_vocabulary_by_key(session: AsyncSession, key: str) -> AResult[bool]:
        try:
            stmt = delete(VocabularyRow).where(VocabularyRow.key == key)
            await session.execute(statement=stmt)

            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in delete_vocabulary_by_key: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to delete vocabulary: {e}",
            )

    @staticmethod
    async def get_all_keys(session: AsyncSession) -> AResult[list[str]]:
        try:
            stmt: Select[tuple[str]] = select(VocabularyRow.key).distinct()
            result: DBResult[tuple[str]] = await session.execute(statement=stmt)

            keys: list[str] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=keys)

        except Exception as e:
            logger.error(f"Error in get_all_keys: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get keys: {e}",
            )
