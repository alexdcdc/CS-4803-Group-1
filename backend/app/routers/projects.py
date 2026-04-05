import random

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, OptionalUser
from app.models.project import (
    AddRewardRequest,
    CreateCampaignRequest,
    ProjectOut,
    ProjectVideoOut,
    RewardOut,
    UploadVideoRequest,
)
from app.services.supabase_client import get_supabase_client

router = APIRouter()

PLACEHOLDER_COLORS = ["#2d00f7", "#1a1a2e", "#1b4332", "#b7410e", "#003049", "#5c3d2e"]


def _build_project(row: dict, videos: list[dict], rewards: list[dict], stats: dict, user_id: str | None) -> ProjectOut:
    return ProjectOut(
        id=row["id"],
        title=row["title"],
        creatorName=row["profiles"]["name"] if isinstance(row.get("profiles"), dict) else "Unknown",
        description=row["description"],
        goalCredits=row["goal_credits"],
        raisedCredits=stats.get("raised_credits", 0),
        backerCount=stats.get("backer_count", 0),
        videos=[
            ProjectVideoOut(
                id=v["id"],
                title=v["title"],
                placeholderColor=v["placeholder_color"],
                videoUrl=v.get("video_url"),
            )
            for v in videos
        ],
        rewards=[
            RewardOut(
                id=r["id"],
                title=r["title"],
                description=r["description"],
                minDonation=r["min_donation"],
                fileName=r.get("file_name"),
            )
            for r in rewards
        ],
        isOwned=(row["creator_id"] == user_id) if user_id else False,
    )


def _fetch_projects(client, user_id: str | None) -> list[ProjectOut]:
    # Fetch projects with creator profile
    projects_resp = client.table("projects").select("*, profiles(name)").order("created_at", desc=True).execute()

    if not projects_resp.data:
        return []

    project_ids = [p["id"] for p in projects_resp.data]

    # Batch fetch videos, rewards, stats
    videos_resp = client.table("project_videos").select("*").in_("project_id", project_ids).execute()
    rewards_resp = client.table("rewards").select("*").in_("project_id", project_ids).execute()
    stats_resp = client.table("project_stats").select("*").in_("project_id", project_ids).execute()

    # Index by project_id
    videos_by_project: dict[str, list[dict]] = {}
    for v in videos_resp.data:
        videos_by_project.setdefault(v["project_id"], []).append(v)

    rewards_by_project: dict[str, list[dict]] = {}
    for r in rewards_resp.data:
        rewards_by_project.setdefault(r["project_id"], []).append(r)

    stats_by_project: dict[str, dict] = {}
    for s in stats_resp.data:
        stats_by_project[s["project_id"]] = s

    return [
        _build_project(
            p,
            videos_by_project.get(p["id"], []),
            rewards_by_project.get(p["id"], []),
            stats_by_project.get(p["id"], {"raised_credits": 0, "backer_count": 0}),
            user_id,
        )
        for p in projects_resp.data
    ]


@router.get("", response_model=list[ProjectOut])
async def list_projects(user: OptionalUser):
    client = user.client if user else get_supabase_client()
    user_id = user.id if user else None
    return _fetch_projects(client, user_id)


@router.get("/search", response_model=list[ProjectOut])
async def search_projects(q: str, user: OptionalUser):
    client = user.client if user else get_supabase_client()
    user_id = user.id if user else None

    # Search by title or creator name using ilike
    projects_resp = (
        client.table("projects")
        .select("*, profiles(name)")
        .or_(f"title.ilike.%{q}%,profiles.name.ilike.%{q}%")
        .order("created_at", desc=True)
        .execute()
    )

    if not projects_resp.data:
        return []

    project_ids = [p["id"] for p in projects_resp.data]

    videos_resp = client.table("project_videos").select("*").in_("project_id", project_ids).execute()
    rewards_resp = client.table("rewards").select("*").in_("project_id", project_ids).execute()
    stats_resp = client.table("project_stats").select("*").in_("project_id", project_ids).execute()

    videos_by_project: dict[str, list[dict]] = {}
    for v in videos_resp.data:
        videos_by_project.setdefault(v["project_id"], []).append(v)

    rewards_by_project: dict[str, list[dict]] = {}
    for r in rewards_resp.data:
        rewards_by_project.setdefault(r["project_id"], []).append(r)

    stats_by_project: dict[str, dict] = {}
    for s in stats_resp.data:
        stats_by_project[s["project_id"]] = s

    # Filter out projects where profiles join returned null (creator name search miss)
    results = []
    for p in projects_resp.data:
        if p.get("profiles") is None:
            continue
        results.append(
            _build_project(
                p,
                videos_by_project.get(p["id"], []),
                rewards_by_project.get(p["id"], []),
                stats_by_project.get(p["id"], {"raised_credits": 0, "backer_count": 0}),
                user_id,
            )
        )
    return results


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user: OptionalUser):
    client = user.client if user else get_supabase_client()
    user_id = user.id if user else None

    resp = client.table("projects").select("*, profiles(name)").eq("id", project_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Project not found")

    videos = client.table("project_videos").select("*").eq("project_id", project_id).execute()
    rewards = client.table("rewards").select("*").eq("project_id", project_id).execute()
    stats = client.table("project_stats").select("*").eq("project_id", project_id).single().execute()

    return _build_project(
        resp.data,
        videos.data,
        rewards.data,
        stats.data if stats.data else {"raised_credits": 0, "backer_count": 0},
        user_id,
    )


@router.post("", response_model=ProjectOut)
async def create_campaign(req: CreateCampaignRequest, user: CurrentUser):
    resp = user.client.table("projects").insert({
        "creator_id": user.id,
        "title": req.title,
        "description": req.description,
        "goal_credits": req.goalCredits,
    }).execute()
    project = resp.data[0]

    # Get creator name
    profile = user.client.table("profiles").select("name").eq("id", user.id).single().execute()

    return ProjectOut(
        id=project["id"],
        title=project["title"],
        creatorName=profile.data["name"],
        description=project["description"],
        goalCredits=project["goal_credits"],
        raisedCredits=0,
        backerCount=0,
        videos=[],
        rewards=[],
        isOwned=True,
    )


@router.post("/{project_id}/videos")
async def upload_video(project_id: str, req: UploadVideoRequest, user: CurrentUser):
    # Verify ownership
    project = user.client.table("projects").select("creator_id").eq("id", project_id).single().execute()
    if not project.data or project.data["creator_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not the project owner")

    color = random.choice(PLACEHOLDER_COLORS)
    resp = user.client.table("project_videos").insert({
        "project_id": project_id,
        "title": req.title,
        "placeholder_color": color,
    }).execute()

    return {"success": True, "video": resp.data[0]}


@router.post("/{project_id}/rewards")
async def add_reward(project_id: str, req: AddRewardRequest, user: CurrentUser):
    # Verify ownership
    project = user.client.table("projects").select("creator_id").eq("id", project_id).single().execute()
    if not project.data or project.data["creator_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not the project owner")

    resp = user.client.table("rewards").insert({
        "project_id": project_id,
        "title": req.title,
        "description": req.description,
        "min_donation": req.minDonation,
        "file_name": req.fileName,
    }).execute()

    return {"success": True, "reward": resp.data[0]}
