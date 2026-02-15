from fastapi import HTTPException
from passlib.context import CryptContext

from backend.access.userAccess import UserAccess
from backend.db.ormModels.main.user import UserRow

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def verify_password(plain: str, hashed: str):
    return pwd.verify(plain, hashed)


async def login_user(username: str, password: str) -> UserRow:
    user: UserRow | None = UserAccess.get_user_from_username(username)

    if not user:
        raise HTTPException(400, "Invalid credentials")

    if not user.password_hash:
        raise HTTPException(400, "Use Google login")

    if not await verify_password(password, user.password_hash):
        raise HTTPException(400, "Invalid credentials")

    return user
