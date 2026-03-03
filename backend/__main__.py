import asyncio

from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db  # type: ignore

logger = getLogger(__name__)


async def main() -> None:
    logger.info("Future CLI in progress")

    while True:
        try:
            command = input("> ")
        except KeyboardInterrupt:
            break

        if command == "exit":
            break
        elif command == "reinit":
            await rockit_db.reinit()
        elif command == "zod":
            from backend.utils.zod_generator import generate_zod_schemas

            await generate_zod_schemas()
        else:
            print("Command not found.")

    print("Bye!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
