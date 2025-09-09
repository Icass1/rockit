from fastapi import HTTPException, APIRouter

from backend.utils.auth import create_access_token, get_user_by_username
from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id
from backend.db.ormModels.user import UserRow

from backend.requests.signUp import SignUpRequest
from backend.requests.logIn import LoginInRequest
from backend.requests.oAuth import OAuthRequest

from backend.initDb import rockit_db

from argon2 import PasswordHasher

# Configure Argon2 parameters (matches your hash's parameters)
ph = PasswordHasher(
    time_cost=2,       # t=2
    memory_cost=19456,  # m=19456 (in KiB)
    parallelism=1,     # p=1
)

logger = getLogger(__file__)
router = APIRouter(prefix="/auth")


@router.post("/signup")
def signup(payload: SignUpRequest):

    if payload.password != payload.repeatPassword:
        raise HTTPException(status_code=400, detail="Passwords not match.")

    with rockit_db.session_scope() as s:
        user_to_add = UserRow(
            public_id=create_id(),
            username=payload.username,
            password_hash=ph.hash(payload.password)
        )
        if s.query(UserRow).where(UserRow.username == payload.username).first():
            raise HTTPException(status_code=400, detail="User already exists.")

        s.add(user_to_add)
        s.commit()

    return "OK"


@router.post("/login")
def login(payload: LoginInRequest):
    with rockit_db.session_scope() as s:
        user: UserRow | None = get_user_by_username(s, payload.username)
        if not user or not user.password_hash or not ph.verify(payload.password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Invalid credentials")
        token = create_access_token(
            {"user_id": str(user.id), "sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.username, "image": user.image}}


@router.post("/oauth")
def oauth_upsert(payload: OAuthRequest):

    with rockit_db.session_scope() as s:
        user = None
        if payload.username:
            user: UserRow | None = get_user_by_username(
                db=s, username=payload.username)
        if not user:
            user = s.query(_entity=UserRow).filter(UserRow.provider == payload.provider,
                                                   UserRow.provider_account_id == payload.provider_account_id).first()
        if not user:
            # create
            user = UserRow(
                public_id=create_id(),
                username=payload.username,
                provider=payload.provider,
                provider_account_id=payload.provider_account_id
            )
            s.add(user)
            s.commit()
            s.refresh(user)
        else:
            # update some fields if useful
            user.username = payload.name or user.username
            user.image = payload.image or user.image
            user.provider = payload.provider
            user.provider_account_id = payload.provider_account_id
        token = create_access_token(
            {"user_id": str(user.id), "sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "image": user.image}}
