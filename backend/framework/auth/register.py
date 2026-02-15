from fastapi import HTTPException

from backend.db.ormModels.main.user import UserRow
from backend.access.userAccess import UserAccess


async def register_user(username: str, password: str) -> UserRow:
    user = UserAccess.get_user_from_username(username=username)

    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user: UserRow = UserAccess.create_user(
        username=username, password=password)

    return user
