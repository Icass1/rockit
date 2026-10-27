import os
from dataclasses import dataclass
from importlib import import_module
from logging import Logger
from pathlib import Path
from types import ModuleType
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db import db_context
from core.access.db.ormModels.provider import ProviderRow
from core.access.providerAccess import ProviderAccess
from core.aResult import AResult, AResultCode
from core.framework.provider.baseExternalRecommendationProvider import (
    BaseExternalRecommendationProvider,
)
from core.framework.provider.baseLyricsProvider import BaseLyricsProvider
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from core.framework.provider.baseProvider import BaseProvider
from core.framework.provider.baseUploadProvider import BaseUploadProvider
from core.framework.provider.types import AddFromUrlAResult
from logger import getLogger

logger: Logger = getLogger(__name__)


class Providers:
    @dataclass
    class ProviderData:
        provider: BaseProvider
        module_path: str
        name: str

    _providers: list[BaseProvider] = []

    def __init__(self) -> None:
        self._offline_media_providers: list[BaseMediaProvider] = []

    def get_local_media_providers(self) -> list[BaseMediaProvider]:
        """Return available local media capabilities, including disabled providers."""
        return [*self.get_media_providers(), *self._offline_media_providers]

    def find_local_media_provider(self, provider_id: int) -> BaseMediaProvider | None:
        for provider in self.get_local_media_providers():
            identity = provider.get_id()
            if identity.is_ok() and identity.result() == provider_id:
                return provider
        return None

    def _load_local_provider(self, module_path: str, provider_id: int, name: str) -> None:
        """Load local file/database capabilities without enabling remote provider calls."""
        try:
            module = import_module(module_path)
            candidate = getattr(module, "provider", None)
            if isinstance(candidate, BaseMediaProvider):
                candidate.set_info(provider_id=provider_id, provider_name=name)
                if candidate not in self._offline_media_providers:
                    self._offline_media_providers.append(candidate)
        except Exception:
            logger.warning("Local provider capability unavailable: %s", module_path, exc_info=True)

    def get_providers(self) -> list[BaseProvider]:
        return self._providers

    def get_media_providers(self) -> list[BaseMediaProvider]:
        return [p for p in self._providers if isinstance(p, BaseMediaProvider)]

    def get_recommendation_providers(self) -> list[BaseExternalRecommendationProvider]:
        """Discover the recommendation capability without knowing integrations."""
        return [p for p in self._providers if isinstance(p, BaseExternalRecommendationProvider)]

    def get_metadata_providers(self) -> list[BaseMetadataProvider]:
        """Return information providers separately from playable media sources."""
        return [p for p in self._providers if isinstance(p, BaseMetadataProvider)]

    def get_lyrics_providers(self) -> list[BaseLyricsProvider]:
        return [p for p in self._providers if isinstance(p, BaseLyricsProvider)]

    def get_upload_providers(self) -> list[BaseUploadProvider]:
        return [p for p in self._providers if isinstance(p, BaseUploadProvider)]

    def match_lyrics_provider(self, provider_name: str) -> BaseLyricsProvider | None:
        for p in self.get_lyrics_providers():
            if p.get_name() == provider_name:
                return p
        return None

    async def async_init(self, session: AsyncSession) -> None:
        a_result_search_providers: AResultCode = await self.search_providers(session=session)
        if a_result_search_providers.is_not_ok():
            logger.error(f"Error searching providers. {a_result_search_providers.info()}")

    def find_provider(self, provider_id: int) -> BaseProvider | None:
        """Find a provider instance matching a database provider ID."""

        for p in self._providers:
            a_result_id: AResult[int] = p.get_id()
            if a_result_id.is_ok() and a_result_id.result() == provider_id:
                return p

        return None

    def find_media_provider(self, provider_id: int) -> BaseMediaProvider | None:
        """Find a provider instance matching a database provider ID."""

        for p in self._providers:
            a_result_id: AResult[int] = p.get_id()
            if (
                a_result_id.is_ok()
                and a_result_id.result() == provider_id
                and isinstance(p, BaseMediaProvider)
            ):
                return p

        return None

    def match_url(self, url: str) -> str | None:
        """Check all providers for a matching URL and return the internal path."""
        for provider in self.get_media_providers():
            path: str | None = provider.match_url(url)
            if path is not None:
                return path
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Try all providers to add media from a URL."""
        for provider in self.get_media_providers():
            a_result = await provider.add_from_url_async(session=session, url=url)
            if a_result.is_ok():
                return a_result
        return AResult(
            code=AResultCode.NOT_FOUND,
            message="No provider could handle this URL",
        )

    async def search_providers(self, session: AsyncSession) -> AResultCode:
        logger.info("Searching providers...")

        a_result_providers_in_db: AResult[list[ProviderRow]] = await ProviderAccess.get_providers(
            session
        )

        if a_result_providers_in_db.is_not_ok():
            logger.error(f"Error getting providers in database. {a_result_providers_in_db.info()}")
            return AResultCode(
                code=a_result_providers_in_db.code(),
                message=a_result_providers_in_db.message(),
            )

        providers_in_db: list[ProviderRow] = a_result_providers_in_db.result()

        providers_by_module: dict[str, ProviderRow] = {
            p.module.removeprefix("backend.").removeprefix("apps.backend."): p
            for p in providers_in_db
        }

        new_providers: list[Providers.ProviderData] = []

        backend_root = Path(__file__).resolve().parents[3]
        for dirpath, _, filenames in os.walk(backend_root):
            dirpath = dirpath.replace("./", "")

            dirpaths = dirpath.split("/")

            if dirpaths[-1] != "provider":
                continue

            for filename in filenames:
                base: str = ".".join(Path(dirpath).relative_to(backend_root).parts)
                module_path: str = f"{base}.{filename.replace('.py', '')}"

                if module_path in providers_by_module:
                    db_provider = providers_by_module[module_path]
                    if db_provider.disabled:
                        logger.info(
                            f"Provider '{db_provider.name}' is disabled, using BaseProvider"
                        )
                        disabled_provider = BaseProvider()
                        disabled_provider.set_info(
                            provider_id=db_provider.id, provider_name=db_provider.name
                        )
                        self._providers.append(disabled_provider)
                    else:
                        logger.info(f"Adding enabled provider {module_path}")
                        try:
                            module: ModuleType = import_module(module_path)
                            if hasattr(module, "provider") and hasattr(module, "name"):
                                provider = module.provider
                                provider_name = module.name
                                await provider.async_init(session)
                                provider.set_info(
                                    provider_id=db_provider.id,
                                    provider_name=db_provider.name,
                                )
                                self._providers.append(provider)
                            else:
                                logger.error(f"Module {module_path} missing provider or name")
                        except Exception as e:
                            logger.exception(f"Error loading {module_path}. Error {e}.")
                            self._load_local_provider(
                                module_path=module_path,
                                provider_id=db_provider.id,
                                name=db_provider.name,
                            )
                    continue

                try:
                    module: ModuleType = import_module(module_path)

                    if not hasattr(module, "provider"):
                        logger.debug(f"{module_path} doesn't have 'provider' defined")
                        continue

                    if not hasattr(module, "name"):
                        logger.debug(f"{module_path} doesn't have 'name' defined")
                        continue

                    provider = module.provider
                    provider_name = module.name
                    if not isinstance(provider, BaseProvider):
                        logger.error(
                            f"Variable provider in module {module_path} is not a "
                            f"BaseProvider instance"
                        )
                    if not isinstance(provider_name, str):
                        logger.error(f"Variable name in module {module_path} is not a str instance")
                    else:
                        logger.info(f"Adding new provider {module_path}")

                        new_providers.append(
                            Providers.ProviderData(
                                provider=provider,
                                module_path=module_path,
                                name=provider_name,
                            )
                        )
                except Exception as e:
                    logger.error(f"Error loading {module_path}. Error {e}.")

        logger.info("Done searching providers.")

        for provider_data in new_providers:
            self._providers.append(provider_data.provider)

            a_result_provider: AResult[ProviderRow] = await ProviderAccess.add_provider(
                session, name=provider_data.name, module=provider_data.module_path
            )

            if a_result_provider.is_not_ok():
                logger.error(f"Error adding provider to database. Code {a_result_provider.code()}")
                continue

            provider_data.provider.set_info(
                provider_id=a_result_provider.result().id,
                provider_name=a_result_provider.result().name,
            )

        await db_context.after_all_providers_tables_init()

        return AResultCode(code=AResultCode.OK, message="OK")

    async def _playlist_provider_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseMediaProvider]:
        from core.enums.mediaTypeEnum import MediaTypeEnum
        from core.framework.media.media import Media

        media = await Media.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.PLAYLIST],
        )
        if media.is_not_ok():
            logger.error(f"Error finding playlist provider: {media.info()}")
            return AResult(code=media.code(), message=media.message())
        provider = self.find_media_provider(media.result().provider_id)
        if provider is None:
            logger.error("Playlist provider is unavailable")
            return AResult(code=AResultCode.NOT_FOUND, message="Playlist provider unavailable")
        return AResult(code=AResultCode.OK, message="OK", result=provider)

    async def add_media_to_playlist_async(
        self,
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        media_public_id: str,
    ) -> AResult[Any]:
        found = await self._playlist_provider_async(session, playlist_public_id)
        if found.is_not_ok():
            logger.error(f"Cannot add playlist item: {found.info()}")
            return AResult(code=found.code(), message=found.message())
        return await found.result().add_media_to_playlist_async(
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user_id,
            media_public_id=media_public_id,
        )

    async def set_media_expanded_async(
        self,
        session: AsyncSession,
        user_id: int,
        playlist_public_id: str,
        media_public_id: str,
        is_expanded: bool,
    ) -> AResult[bool]:
        found = await self._playlist_provider_async(session, playlist_public_id)
        if found.is_not_ok():
            logger.error(f"Cannot set expanded playlist item: {found.info()}")
            return AResult(code=found.code(), message=found.message())
        return await found.result().set_media_expanded_async(
            session=session,
            user_id=user_id,
            playlist_public_id=playlist_public_id,
            media_public_id=media_public_id,
            is_expanded=is_expanded,
        )
