from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.vocabularyAccess import VocabularyAccess
from backend.core.access.languageAccess import LanguageAccess
from backend.core.framework.models.vocabulary import (
    VocabularyImportData,
)

logger: Logger = getLogger(__name__)


class Vocabulary:
    @staticmethod
    async def get_vocabulary_by_lang_id(
        session: AsyncSession, lang_id: int
    ) -> AResult[dict[str, str]]:
        """Get vocabulary for a specific language."""

        a_result_vocabulary = await VocabularyAccess.get_vocabulary_dict_by_lang_id(
            session=session, lang_id=lang_id
        )

        if a_result_vocabulary.is_not_ok():
            logger.error(f"Error getting vocabulary. {a_result_vocabulary.info()}")
            return AResult(
                code=a_result_vocabulary.code(), message=a_result_vocabulary.message()
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=a_result_vocabulary.result(),
        )

    @staticmethod
    async def get_vocabulary_by_lang_code(
        session: AsyncSession, lang_code: str
    ) -> AResult[dict[str, str]]:
        """Get vocabulary for a language by its language code."""

        a_result_language = await LanguageAccess.get_language_from_code(
            session=session, lang_code=lang_code
        )
        if a_result_language.is_not_ok():
            logger.error(
                f"Unable to get language from code. {a_result_language.info()}"
            )
            return AResult(
                code=a_result_language.code(), message=a_result_language.message()
            )

        return await Vocabulary.get_vocabulary_by_lang_id(
            session=session, lang_id=a_result_language.result().id
        )

    @staticmethod
    async def import_vocabulary_from_dict(
        session: AsyncSession,
        vocabulary_data: VocabularyImportData,
    ) -> AResult[bool]:
        """Import vocabulary from a VocabularyImportData dataclass."""

        vocabulary_dict = vocabulary_data.vocabulary
        for lang_code, translations in vocabulary_dict.items():
            a_result_lang = await LanguageAccess.get_language_from_code(
                session=session, lang_code=lang_code
            )
            if a_result_lang.is_not_ok():
                logger.error(f"Language {lang_code} not found in database")
                continue

            lang_id = a_result_lang.result().id

            for key, value in translations.items():
                a_result_upsert = await VocabularyAccess.upsert_vocabulary(
                    session=session, key=key, lang_id=lang_id, value=value
                )
                if a_result_upsert.is_not_ok():
                    logger.error(
                        f"Error upserting vocabulary {key}: {a_result_upsert.info()}"
                    )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def remove_keys_not_in_import(
        session: AsyncSession, valid_keys: List[str]
    ) -> AResult[bool]:
        """Remove vocabulary keys that exist in database but not in import."""

        a_result_keys = await VocabularyAccess.get_all_keys(session=session)
        if a_result_keys.is_not_ok():
            logger.error(f"Error getting keys: {a_result_keys.info()}")
            return AResult(code=a_result_keys.code(), message=a_result_keys.message())

        db_keys = set(a_result_keys.result())
        import_keys = set(valid_keys)

        keys_to_remove = db_keys - import_keys

        for key in keys_to_remove:
            a_result_delete = await VocabularyAccess.delete_vocabulary_by_key(
                session=session, key=key
            )
            if a_result_delete.is_ok():
                logger.info(f"Removed vocabulary key: {key}")
            else:
                logger.error(f"Error removing key {key}: {a_result_delete.info()}")

        return AResult(code=AResultCode.OK, message="OK", result=True)
