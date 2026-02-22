
from backend.constants import IMAGES_PATH
from backend.utils.addInit import add_init_to_orm
import shutil

shutil.copytree("backend/images", IMAGES_PATH, dirs_exist_ok=True)

add_init_to_orm()
