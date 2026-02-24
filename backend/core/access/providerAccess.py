from typing import List, Tuple
from sqlalchemy.sql import Select
from sqlalchemy import Select, select

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.provider import ProviderRow

logger = getLogger(__name__)


class ProviderAccess:
    @staticmethod
    async def get_providers() -> AResult[List[ProviderRow]]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[ProviderRow]] = select(ProviderRow)
                result = await s.execute(stmt)
                rows: List[ProviderRow] = list(result.scalars().all())

                for row in rows:
                    s.expunge(row)

                return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting providers: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting providers"
            )

    @staticmethod
    async def add_provider(name: str, module: str) -> AResult[ProviderRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                provider = ProviderRow(name=name, module=module)
                s.add(provider)
                await s.commit()
                await s.refresh(provider)
                s.expunge(provider)

                return AResult(code=AResultCode.OK, message="OK", result=provider)
        except Exception as e:
            logger.error(f"Unable to add provider: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Unable to add new provider to database.")
