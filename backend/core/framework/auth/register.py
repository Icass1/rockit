from fastapi import HTTPException

from backend.core.access.userAccess import UserAccess
from backend.core.access.db.ormModels.user import UserRow


async def register_user(username: str, password: str) -> UserRow:
    user = UserAccess.get_user_from_username(username=username)

    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user: UserRow = UserAccess.create_user(
        username=username, password=password)

    return user
