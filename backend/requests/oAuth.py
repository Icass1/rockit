from typing import Optional
from pydantic import BaseModel


class OAuthRequest(BaseModel):
    provider: str
    provider_account_id: str
    username: Optional[str] = None
    name: Optional[str] = None
    image: Optional[str] = None
