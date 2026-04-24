from pydantic import BaseModel


class RewardOut(BaseModel):
    id: str
    title: str
    description: str
    minDonation: int
    fileName: str | None = None


class ProjectVideoOut(BaseModel):
    id: str
    title: str
    placeholderColor: str
    videoUrl: str | None = None
    thumbnailUrl: str | None = None
    status: str = "pending"
    assetId: str | None = None
    playbackId: str | None = None
    durationSeconds: float | None = None


class CreateVideoUploadResponse(BaseModel):
    video: ProjectVideoOut
    uploadUrl: str
    uploadId: str


class ProjectOut(BaseModel):
    id: str
    title: str
    creatorName: str
    description: str
    goalCredits: int
    raisedCredits: int
    backerCount: int
    videos: list[ProjectVideoOut]
    rewards: list[RewardOut]
    isOwned: bool


class CreateCampaignRequest(BaseModel):
    title: str
    description: str
    goalCredits: int


class UploadVideoRequest(BaseModel):
    title: str


class AddRewardRequest(BaseModel):
    title: str
    description: str
    minDonation: int
    fileName: str | None = None
