from pydantic import BaseModel

from app.models.project import ProjectVideoOut


class FeedProjectSummary(BaseModel):
    id: str
    title: str
    creatorName: str
    raisedCredits: int
    goalCredits: int
    backerCount: int


class FeedInteraction(BaseModel):
    liked: bool
    disliked: bool


class FeedItem(BaseModel):
    video: ProjectVideoOut
    project: FeedProjectSummary
    interaction: FeedInteraction
    commentCount: int = 0


class RecordInteractionRequest(BaseModel):
    videoId: str
    type: str  # 'like', 'dislike', 'view'
