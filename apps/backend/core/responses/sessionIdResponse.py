from pydantic import BaseModel


class SessionIdResponse(BaseModel):
    sessionId: str
