from pydantic import BaseModel


class RemoveContributorRequest(BaseModel):
    targetUserPublicId: str
