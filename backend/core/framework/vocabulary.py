from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.language import LanguageRow

from backend.core.access.vocabularyAccess import VocabularyAccess
from backend.core.access.languageAccess import LanguageAccess
from backend.core.framework.models.vocabulary import (
    LanguageVocabulary,
    AllVocabulary,
    VocabularyImportData,
)

logger: Logger = getLogger(__name__)


class Vocabulary:
    @staticmethod
    async def get_all_vocabulary(
        session: AsyncSession,
    ) -> AResult[AllVocabulary]:
        """Get all vocabulary organized by language."""

        a_result_languages: AResult[List[LanguageRow]] = (
            await LanguageAccess.get_all_languages(session=session)
        )
        if a_result_languages.is_not_ok():
            logger.error(f"Error getting languages. {a_result_languages.info()}")
            return AResult(
                code=a_result_languages.code(), message=a_result_languages.message()
            )

        a_result_vocabulary = await VocabularyAccess.get_all_vocabulary(session=session)
        if a_result_vocabulary.is_not_ok():
            logger.error(f"Error getting vocabulary. {a_result_vocabulary.info()}")
            return AResult(
                code=a_result_vocabulary.code(), message=a_result_vocabulary.message()
            )

        languages_dict: dict[str, LanguageVocabulary] = {
            lang.lang_code: LanguageVocabulary(lang_code=lang.lang_code)
            for lang in a_result_languages.result()
        }

        for vocab in a_result_vocabulary.result():
            lang_code = next(
                (
                    l.lang_code
                    for l in a_result_languages.result()
                    if l.id == vocab.lang_id
                ),
                None,
            )
            if lang_code and lang_code in languages_dict:
                languages_dict[lang_code].translations[vocab.key] = vocab.value

        all_vocabulary = AllVocabulary(languages=list(languages_dict.values()))

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=all_vocabulary,
        )

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
