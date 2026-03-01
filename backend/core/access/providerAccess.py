from typing import List, Tuple
from sqlalchemy.sql import Select
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.provider import ProviderRow

logger = getLogger(__name__)


class ProviderAccess:
    @staticmethod
    async def get_providers(session: AsyncSession) -> AResult[List[ProviderRow]]:
        try:
            stmt: Select[Tuple[ProviderRow]] = select(ProviderRow)
            result = await session.execute(stmt)
            rows: List[ProviderRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting providers: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting providers"
            )

    @staticmethod
    async def add_provider(
        session: AsyncSession, name: str, module: str
    ) -> AResult[ProviderRow]:
        try:
            provider = ProviderRow(name=name, module=module)
            session.add(provider)
            await session.commit()
            await session.refresh(provider)

            return AResult(code=AResultCode.OK, message="OK", result=provider)
        except Exception as e:
            logger.error(f"Unable to add provider: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Unable to add new provider to database.",
            )
