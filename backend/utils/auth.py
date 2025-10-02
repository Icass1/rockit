import traceback
from jose import jwt, JWTError
from datetime import UTC, datetime, timedelta

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException

from backend.utils.logger import getLogger
from backend.db.ormModels.user import UserRow
from backend.constants import JWT_SECRET

from backend.init import rockit_db

security = HTTPBearer()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = -1

logger = getLogger(__file__)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=401, detail="Invalid token")
    with rockit_db.session_scope() as s:
        user = get_user(s, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    if expires_minutes != -1:
        expire = datetime.now(UTC) + timedelta(minutes=expires_minutes)
        to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


def get_user_by_username(db, username: str):
    return db.query(UserRow).filter(UserRow.username == username).first()


def get_user(db, user_id: int):
    return db.query(UserRow).filter(UserRow.id == user_id).first()
