from logging import Logger

from backend.constants import (
    DB_NAME,
    DB_HOST,
    DB_PASSWORD,
    DB_PORT,
    DB_USER,
    DB_IAM_AUTH,
    DB_REGION,
    DB_SSLMODE,
    DB_SSLROOTCERT,
)
from backend.utils.logger import getLogger
from backend.core.access.db.rockItDb import RockItDB

logger: Logger = getLogger(__name__)


rockit_db = RockItDB(
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    iam_auth=DB_IAM_AUTH,
    region=DB_REGION,
    sslmode=DB_SSLMODE,
    sslrootcert=DB_SSLROOTCERT,
)
