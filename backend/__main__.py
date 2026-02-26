from backend.core.access.db import rockit_db  # type: ignore
from backend.utils.logger import getLogger
import asyncio

import os

os.environ["SKIP_INITIAL_CONTENT"] = "true"


logger = getLogger(__name__)


async def main() -> None:
    logger.info("Future CLI in progress")

    while True:
        command = input("> ")

        if command == "exit":
            print("Bye!")
            break
        elif command == "reinit":
            await rockit_db.reinit()
        elif command == "zod":
            from backend.utils.zod_generator import generate_zod_schemas

            await generate_zod_schemas()
        else:
            print("Command not found.")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
