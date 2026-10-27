from config import settings
from core.access.db.database import Database

db_context = Database(
    username=settings.DB_USER,
    password=settings.DB_PASSWORD,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    database=settings.DB_NAME,
    iam_auth=settings.DB_IAM_AUTH,
    region=settings.DB_REGION,
    sslmode=settings.DB_SSLMODE,
    sslrootcert=settings.DB_SSLROOTCERT,
)
