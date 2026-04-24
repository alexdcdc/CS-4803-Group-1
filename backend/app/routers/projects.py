import random

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, OptionalUser
from app.models.project import (
    AddRewardRequest,
    CreateCampaignRequest,
    CreateVideoUploadResponse,
    ProjectOut,
    ProjectVideoOut,
    RewardOut,
    UploadVideoRequest,
)
from app.services import mux_service
from app.services.supabase_client import get_supabase_admin, get_supabase_client

router = APIRouter()

PLACEHOLDER_COLORS = ["#2d00f7", "#1a1a2e", "#1b4332", "#b7410e", "#003049", "#5c3d2e"]


def _video_to_out(v: dict) -> ProjectVideoOut:
    playback_id = v.get("playback_id")
    video_url = v.get("video_url") or (mux_service.playback_url(playback_id) if playback_id else None)
    thumbnail_url = mux_service.thumbnail_url(playback_id) if playback_id else None
    return ProjectVideoOut(
        id=v["id"],
        title=v["title"],
        placeholderColor=v["placeholder_color"],
        videoUrl=video_url,
        thumbnailUrl=thumbnail_url,
        status=v.get("status") or "pending",
        assetId=v.get("asset_id"),
        playbackId=playback_id,
        durationSeconds=float(v["duration_seconds"]) if v.get("duration_seconds") is not None else None,
    )


def _build_project(row: dict, videos: list[dict], rewards: list[dict], stats: dict, user_id: str | None) -> ProjectOut:
    return ProjectOut(
        id=row["id"],
        title=row["title"],
        creatorName=row["profiles"]["name"] if isinstance(row.get("profiles"), dict) else "Unknown",
        description=row["description"],
        goalCredits=row["goal_credits"],
        raisedCredits=stats.get("raised_credits", 0),
        backerCount=stats.get("backer_count", 0),
        videos=[_video_to_out(v) for v in videos],
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
    query = q.strip()

    if not query:
        return _fetch_projects(client, user_id)

    # PostgREST cannot parse joined fields like profiles.name inside or_().
    # Search creator names separately, then merge the matching projects.
    title_resp = (
        client.table("projects")
        .select("*, profiles(name)")
        .ilike("title", f"%{query}%")
        .order("created_at", desc=True)
        .execute()
    )
    profile_resp = client.table("profiles").select("id").ilike("name", f"%{query}%").execute()
    creator_ids = [profile["id"] for profile in profile_resp.data]

    creator_resp = None
    if creator_ids:
        creator_resp = (
            client.table("projects")
            .select("*, profiles(name)")
            .in_("creator_id", creator_ids)
            .order("created_at", desc=True)
            .execute()
        )

    projects_by_id: dict[str, dict] = {}
    for project in title_resp.data:
        projects_by_id[project["id"]] = project
    if creator_resp:
        for project in creator_resp.data:
            projects_by_id[project["id"]] = project

    projects = sorted(
        projects_by_id.values(),
        key=lambda project: project.get("created_at", ""),
        reverse=True,
    )

    if not projects:
        return []

    project_ids = [p["id"] for p in projects]

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

    results = []
    for p in projects:
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


@router.post("/{project_id}/videos", response_model=CreateVideoUploadResponse)
async def create_video_upload(project_id: str, req: UploadVideoRequest, user: CurrentUser):
    """Create a Mux direct upload and a pending project_videos row.

    The client uploads the file directly to the returned `uploadUrl` (PUT),
    then polls `GET /projects/{project_id}/videos/{video_id}` until status
    transitions to `ready`.
    """
    project = user.client.table("projects").select("creator_id").eq("id", project_id).single().execute()
    if not project.data or project.data["creator_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not the project owner")

    color = random.choice(PLACEHOLDER_COLORS)
    inserted = user.client.table("project_videos").insert({
        "project_id": project_id,
        "title": req.title,
        "placeholder_color": color,
        "status": "pending",
    }).execute()
    video_row = inserted.data[0]

    upload = await mux_service.create_direct_upload(passthrough=video_row["id"])

    user.client.table("project_videos").update({
        "upload_id": upload["id"],
    }).eq("id", video_row["id"]).execute()

    video_row["upload_id"] = upload["id"]
    return CreateVideoUploadResponse(
        video=_video_to_out(video_row),
        uploadUrl=upload["url"],
        uploadId=upload["id"],
    )


@router.get("/{project_id}/videos/{video_id}", response_model=ProjectVideoOut)
async def get_video(project_id: str, video_id: str, user: OptionalUser):
    """Return current video state, reconciling with Mux if still pending."""
    client = user.client if user else get_supabase_client()
    resp = (
        client.table("project_videos")
        .select("*")
        .eq("id", video_id)
        .eq("project_id", project_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Video not found")

    video = resp.data

    if video.get("status") in ("ready", "errored", "cancelled"):
        return _video_to_out(video)

    updates: dict = {}
    asset_id = video.get("asset_id")

    if not asset_id and video.get("upload_id"):
        try:
            upload = await mux_service.get_upload(video["upload_id"])
        except HTTPException:
            return _video_to_out(video)
        asset_id = upload.get("asset_id")
        derived = mux_service.derive_status(upload.get("status"))
        if asset_id and asset_id != video.get("asset_id"):
            updates["asset_id"] = asset_id
        if derived != video.get("status"):
            updates["status"] = derived

    if asset_id:
        try:
            asset = await mux_service.get_asset(asset_id)
        except HTTPException:
            asset = None
        if asset:
            summary = mux_service.asset_summary(asset)
            for key in ("asset_id", "playback_id", "status", "duration_seconds"):
                value = summary.get(key)
                if value is not None and value != video.get(key):
                    updates[key] = value

    if updates:
        # Reconciliation is a system action — use the admin client so anon
        # readers (and non-creator viewers) can still trigger a refresh.
        get_supabase_admin().table("project_videos").update(updates).eq("id", video_id).execute()
        video.update(updates)

    return _video_to_out(video)


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
