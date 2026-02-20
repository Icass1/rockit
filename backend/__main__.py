# Executed with: python3 -m backend

from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db  # type: ignore
import backend.core.framework  # type: ignore

logger = getLogger(__name__)
logger.info("Future CLI in progress")

while True:
    command = input("> ")

    if command == "exit":
        print("Bye!")
        break
    elif command == "reinit":
        rockit_db.reinit()
    else:
        print("Command not found.")
