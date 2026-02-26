import shutil
import asyncio

from backend.constants import IMAGES_PATH
from backend.utils.addInit import add_init_to_orm
from backend.utils.zod_generator import generate_zod_schemas

shutil.copytree("backend/images", IMAGES_PATH, dirs_exist_ok=True)

add_init_to_orm()


async def main():
    await generate_zod_schemas()


try:
    # Try to get running loop
    loop = asyncio.get_running_loop()
    loop.create_task(generate_zod_schemas())
except RuntimeError:
    # No running loop → create one and run
    asyncio.run(main())
