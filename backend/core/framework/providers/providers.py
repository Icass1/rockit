import os
from typing import List
from logging import Logger
from types import ModuleType
from dataclasses import dataclass
from importlib import import_module

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.providerAccess import ProviderAccess
from backend.core.access.db.ormModels.provider import ProviderRow

from backend.core.framework.provider.baseProvider import BaseProvider


logger: Logger = getLogger(__name__)


class Providers:
    @dataclass
    class ProviderData:
        provider: BaseProvider
        module_path: str
        name: str

    _providers: List[BaseProvider] = []

    def get_providers(self) -> List[BaseProvider]:
        return self._providers

    async def async_init(self):
        a_result_search_providers: AResultCode = await self.search_providers()
        if a_result_search_providers.is_not_ok():
            logger.error(
                f"Error searching providers. {a_result_search_providers.info()}")

    async def search_providers(self) -> AResultCode:
        logger.info("Searching providers...")

        providers_found_data: List[Providers.ProviderData] = []

        for dirpath, _, filenames in os.walk("."):
            dirpath = dirpath.replace("./", "")

            dirpaths = dirpath.split("/")

            if dirpaths[-1] != "provider":
                continue

            for filename in filenames:
                base: str = ".".join(dirpath.split("/"))
                module_path: str = f"{base}.{filename.replace('.py', '')}"
                module: ModuleType = import_module(module_path)

                try:
                    provider = module.provider
                    provider_name = module.name
                    if not isinstance(provider, BaseProvider):
                        logger.error(
                            f"Variable provider in module {module_path} is not a BaseProvider instance")
                    if not isinstance(provider_name, str):
                        logger.error(
                            f"Variable name in module {module_path} is not a str instance")
                    else:
                        logger.info(f"Adding provider {module_path}")

                        await provider.async_init()

                        providers_found_data.append(Providers.ProviderData(
                            provider=provider,
                            module_path=module_path,
                            name=provider_name))
                except Exception as e:
                    logger.warning(
                        f"{module_path} doesn't have 'provider' or 'name' variable. Error {e}.")

        a_result_providers_in_db: AResult[
            List[ProviderRow]
        ] = await ProviderAccess.get_providers()

        if a_result_providers_in_db.is_not_ok():
            logger.error(
                f"Error getting providers in database. {a_result_providers_in_db.info()}")
            return AResultCode(code=a_result_providers_in_db.code(), message=a_result_providers_in_db.message())

        providers_in_db: List[ProviderRow] = a_result_providers_in_db.result()

        for provider in providers_in_db:
            # Search db provider in providers_found_data
            for index, provider_data in enumerate(providers_found_data):
                if provider.module == provider_data.module_path:
                    providers_found_data.pop(index)
                    provider_data.provider.set_info(
                        provider_id=provider.id, provider_name=provider.name)
                    self._providers.append(provider_data.provider)
                    break

            # Handle provider in database not found.
            else:
                logger.error(
                    f"Provider in database {provider.name} couldn't be found.")
                return AResultCode(code=AResultCode.GENERAL_ERROR, message="A provider in database couldn't be found.")

        for index, provider_data in enumerate(providers_found_data):
            self._providers.append(provider_data.provider)

            a_result_provider: AResult[ProviderRow] = await ProviderAccess.add_provider(
                name=provider_data.name,
                module=provider_data.module_path)

            if a_result_provider.is_not_ok():
                logger.error(
                    f"Error adding provider to database. Code {a_result_provider.code()}")
                continue

            provider_data.provider.set_info(
                provider_id=a_result_provider.result().id,
                provider_name=a_result_provider.result().name)

        return AResultCode(code=AResultCode.OK, message="OK")
