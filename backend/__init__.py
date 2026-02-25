import shutil
import asyncio

from backend.constants import IMAGES_PATH
from backend.utils.addInit import add_init_to_orm
from backend.utils.zod_generator import generate_zod_schemas


shutil.copytree("backend/images", IMAGES_PATH, dirs_exist_ok=True)

add_init_to_orm()
asyncio.create_task(generate_zod_schemas())
