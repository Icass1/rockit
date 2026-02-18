from logging import Logger

from backend.constants import DB_NAME, DB_HOST, DB_PASSWORD, DB_PORT, DB_USER
from backend.utils.logger import getLogger
from backend.core.access.db.rockItDb import RockItDB

logger: Logger = getLogger(__name__)


rockit_db = RockItDB(
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME)


logger.info("")
logger.info("$$$$$$$\\                      $$\\       $$$$$$\\ $$\\")
logger.info("$$  __$$\\                     $$ |      \\_$$  _|$$ |")
logger.info("$$ |  $$ | $$$$$$\\   $$$$$$$\\ $$ |  $$\\   $$ |$$$$$$\\")
logger.info("$$$$$$$  |$$  __$$\\ $$  _____|$$ | $$  |  $$ |\\_$$  _|")
logger.info("$$  __$$< $$ /  $$ |$$ /      $$$$$$  /   $$ |  $$ |")
logger.info("$$ |  $$ |$$ |  $$ |$$ |      $$  _$$<    $$ |  $$ |$$\\")
logger.info("$$ |  $$ |\\$$$$$$  |\\$$$$$$$\\ $$ | \\$$\\ $$$$$$\\ \\$$$$  |")
logger.info("\\__|  \\__| \\______/  \\_______|\\__|  \\__|\\______| \\____/")
logger.info("")
