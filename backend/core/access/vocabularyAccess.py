from typing import List, Tuple, Dict

from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.vocabulary import VocabularyRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class VocabularyAccess:
    @staticmethod
    async def get_all_vocabulary(
        session: AsyncSession,
    ) -> AResult[List[VocabularyRow]]:
        try:
            stmt: Select[Tuple[VocabularyRow]] = select(VocabularyRow)
            result: Result[Tuple[VocabularyRow]] = await session.execute(statement=stmt)

            vocabulary: List[VocabularyRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=vocabulary)

        except Exception as e:
            logger.error(f"Error in get_all_vocabulary: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get vocabulary: {e}",
            )

    @staticmethod
    async def get_vocabulary_by_lang_id(
        session: AsyncSession, lang_id: int
    ) -> AResult[List[VocabularyRow]]:
        try:
            stmt: Select[Tuple[VocabularyRow]] = select(VocabularyRow).where(
                VocabularyRow.lang_id == lang_id
            )
            result: Result[Tuple[VocabularyRow]] = await session.execute(statement=stmt)

            vocabulary: List[VocabularyRow] = list(result.scalars().all())

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
    ) -> AResult[Dict[str, str]]:
        try:
            a_result_vocabulary = await VocabularyAccess.get_vocabulary_by_lang_id(
                session=session, lang_id=lang_id
            )
            if a_result_vocabulary.is_not_ok():
                return AResult(
                    code=a_result_vocabulary.code(),
                    message=a_result_vocabulary.message(),
                )

            vocabulary_dict: Dict[str, str] = {
                v.key: v.value for v in a_result_vocabulary.result()
            }

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
            stmt: Select[Tuple[VocabularyRow]] = select(VocabularyRow).where(
                VocabularyRow.key == key,
                VocabularyRow.lang_id == lang_id,
            )
            result: Result[Tuple[VocabularyRow]] = await session.execute(statement=stmt)
            existing: VocabularyRow | None = result.scalar_one_or_none()

            if existing:
                existing.value = value
                await session.commit()
                await session.refresh(instance=existing)
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            new_vocabulary = VocabularyRow(
                key=key,
                lang_id=lang_id,
                value=value,
            )

            session.add(instance=new_vocabulary)
            await session.commit()
            await session.refresh(instance=new_vocabulary)

            return AResult(code=AResultCode.OK, message="OK", result=new_vocabulary)

        except Exception as e:
            logger.error(f"Error in upsert_vocabulary: {e}", exc_info=True)
            await session.rollback()
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to upsert vocabulary: {e}",
            )

    @staticmethod
    async def delete_vocabulary_by_key(
        session: AsyncSession, key: str
    ) -> AResult[bool]:
        try:
            stmt = delete(VocabularyRow).where(VocabularyRow.key == key)
            await session.execute(statement=stmt)
            await session.commit()

            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in delete_vocabulary_by_key: {e}", exc_info=True)
            await session.rollback()
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to delete vocabulary: {e}",
            )

    @staticmethod
    async def get_all_keys(session: AsyncSession) -> AResult[List[str]]:
        try:
            stmt: Select[Tuple[str]] = select(VocabularyRow.key).distinct()
            result: Result[Tuple[str]] = await session.execute(statement=stmt)

            keys: List[str] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=keys)

        except Exception as e:
            logger.error(f"Error in get_all_keys: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get keys: {e}",
            )
