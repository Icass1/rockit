from typing import Dict

from fastapi import APIRouter, HTTPException, Request, Depends
from logging import Logger

from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.core.aResult import AResult
from backend.utils.logger import getLogger

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.vocabulary import Vocabulary
from backend.core.framework.models.vocabulary import AllVocabulary
from backend.core.access.languageAccess import LanguageAccess

from backend.core.access.db.ormModels.user import UserRow

from backend.core.responses.languagesResponse import LanguageItem, LanguagesResponse
from backend.core.responses.userVocabularyResponse import UserVocabularyResponse
from backend.core.responses.vocabularyResponse import VocabularyResponse

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/vocabulary",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Lang"],
)


@router.get("")
async def get_all_vocabulary(request: Request) -> VocabularyResponse:
    """Get all available vocabulary."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_vocabulary: AResult[AllVocabulary] = (
        await Vocabulary.get_all_vocabulary(session=session)
    )

    if a_result_vocabulary.is_not_ok():
        logger.error(f"Error getting vocabulary. {a_result_vocabulary.info()}")
        raise HTTPException(
            status_code=a_result_vocabulary.get_http_code(),
            detail=a_result_vocabulary.message(),
        )

    vocab = a_result_vocabulary.result()
    vocab_dict = {lang.lang_code: lang.translations for lang in vocab.languages}
    return VocabularyResponse(vocabulary=vocab_dict)


@router.get("/user")
async def get_user_vocabulary(request: Request) -> UserVocabularyResponse:
    """Get vocabulary for the authenticated user's language."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    user: UserRow = a_result_user.result()

    a_result_vocabulary: AResult[Dict[str, str]] = (
        await Vocabulary.get_vocabulary_by_lang_id(
            session=session, lang_id=user.lang_id
        )
    )

    if a_result_vocabulary.is_not_ok():
        logger.error(f"Error getting vocabulary. {a_result_vocabulary.info()}")
        raise HTTPException(
            status_code=a_result_vocabulary.get_http_code(),
            detail=a_result_vocabulary.message(),
        )

    return UserVocabularyResponse(
        vocabulary=a_result_vocabulary.result(),
        currentLang=a_result_user.result().language.lang_code,
    )


@router.get("/languages")
async def get_all_languages(request: Request) -> LanguagesResponse:
    """Get all available languages."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_languages = await LanguageAccess.get_all_languages(session=session)

    if a_result_languages.is_not_ok():
        logger.error(f"Error getting languages. {a_result_languages.info()}")
        raise HTTPException(
            status_code=a_result_languages.get_http_code(),
            detail=a_result_languages.message(),
        )

    languages = [
        LanguageItem(langCode=lang.lang_code, language=lang.language)
        for lang in a_result_languages.result()
    ]

    return LanguagesResponse(languages=languages)
