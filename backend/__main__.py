# Executed with: python3 -m backend

from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db  # type: ignore
import backend.core.framework  # type: ignore


logger = getLogger(__name__)

logger.info("Future CLI in progress")
