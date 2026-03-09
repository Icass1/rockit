import sys
import asyncio

from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db  # type: ignore

logger = getLogger(__name__)

command_to_run = sys.argv[1] if len(sys.argv) > 1 else ""

print(command_to_run)


async def main() -> None:
    logger.info("Future CLI in progress")

    first_loop = True

    while True:
        command: str
        if first_loop and command_to_run != "":
            command = command_to_run
            first_loop = False
        else:
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

        if command_to_run != "":
            break

    print("Bye!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
