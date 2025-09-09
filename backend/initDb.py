from backend.db.db import RockitDB

from backend.constants import DB_DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USER, JWT_SECRET

rockit_db = RockitDB(DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE)
