from datetime import datetime

from pydantic import BaseModel, Field


class CommentOut(BaseModel):
    id: str
    videoId: str
    userId: str
    userName: str
    text: str
    createdAt: datetime


class CreateCommentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
