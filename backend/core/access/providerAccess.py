from typing import List, Tuple
from sqlalchemy import Select, select

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.provider import ProviderRow


class ProviderAccess:
    @staticmethod
    def get_providers() -> AResult[List[ProviderRow]]:
        try:
            with rockit_db.session_scope() as s:
                stmt: Select[Tuple[ProviderRow]] = select(ProviderRow)
                rows: List[ProviderRow] = list(s.scalars(stmt).all())

                for row in rows:
                    s.expunge(row)

                return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting providers"
            )

    @staticmethod
    def add_provider(name: str, module: str) -> AResult[ProviderRow]:
        try:
            with rockit_db.session_scope() as s:
                provider = ProviderRow(
                    name=name,
                    module=module
                )

                s.add(provider)
                s.commit()
                s.refresh(provider)
                s.expunge(provider)

                return AResult(code=AResultCode.OK, message="OK", result=provider)
        except:
            return AResult(code=AResultCode.GENERAL_ERROR, message="Unable to add new provider to database.")
