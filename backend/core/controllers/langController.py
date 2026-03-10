from typing import Dict

from fastapi import APIRouter, HTTPException, Request, Depends
from logging import Logger

from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.core.aResult import AResult
from backend.utils.logger import getLogger

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.vocabulary import Vocabulary

from backend.core.access.db.ormModels.user import UserRow

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

    a_result_vocabulary: AResult[Dict[str, Dict[str, str]]] = (
        await Vocabulary.get_all_vocabulary(session=session)
    )

    if a_result_vocabulary.is_not_ok():
        logger.error(f"Error getting vocabulary. {a_result_vocabulary.info()}")
        raise HTTPException(
            status_code=a_result_vocabulary.get_http_code(),
            detail=a_result_vocabulary.message(),
        )

    return VocabularyResponse(vocabulary=a_result_vocabulary.result())


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

    return UserVocabularyResponse(vocabulary=a_result_vocabulary.result())
