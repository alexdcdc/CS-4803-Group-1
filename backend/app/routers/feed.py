from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.models.feed import FeedInteraction, FeedItem, FeedProjectSummary, RecordInteractionRequest
from app.models.project import ProjectVideoOut
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.get("", response_model=list[FeedItem])
async def get_feed(user: CurrentUser, limit: int = 10, offset: int = 0):
    client = user.client

    # Get videos the user has disliked so we can exclude them
    disliked_resp = client.table("video_interactions").select("video_id").eq("user_id", user.id).eq("interaction_type", "dislike").execute()
    disliked_ids = [d["video_id"] for d in disliked_resp.data]

    # Fetch all videos with their project info
    # Use the anon client for public data (project_videos and projects are publicly readable)
    anon = get_supabase_client()
    query = anon.table("project_videos").select("*, projects(*, profiles(name))")

    if disliked_ids:
        # Exclude disliked videos
        query = query.not_.in_("id", disliked_ids)

    videos_resp = query.limit(limit).offset(offset).execute()

    if not videos_resp.data:
        return []

    # Get project stats
    project_ids = list({v["projects"]["id"] for v in videos_resp.data if v.get("projects")})
    stats_resp = anon.table("project_stats").select("*").in_("project_id", project_ids).execute()
    stats_map = {s["project_id"]: s for s in stats_resp.data}

    # Get user's interactions for these videos
    video_ids = [v["id"] for v in videos_resp.data]
    interactions_resp = client.table("video_interactions").select("video_id, interaction_type").eq("user_id", user.id).in_("video_id", video_ids).execute()

    interaction_map: dict[str, dict[str, bool]] = {}
    for i in interactions_resp.data:
        vid = i["video_id"]
        if vid not in interaction_map:
            interaction_map[vid] = {"liked": False, "disliked": False}
        if i["interaction_type"] == "like":
            interaction_map[vid]["liked"] = True
        elif i["interaction_type"] == "dislike":
            interaction_map[vid]["disliked"] = True

    # Build feed items (random order is achieved by Postgres default + no ORDER BY)
    items = []
    for v in videos_resp.data:
        proj = v.get("projects")
        if not proj:
            continue
        stats = stats_map.get(proj["id"], {"raised_credits": 0, "backer_count": 0})
        creator_name = proj.get("profiles", {}).get("name", "Unknown") if isinstance(proj.get("profiles"), dict) else "Unknown"

        inter = interaction_map.get(v["id"], {"liked": False, "disliked": False})

        items.append(FeedItem(
            video=ProjectVideoOut(
                id=v["id"],
                title=v["title"],
                placeholderColor=v["placeholder_color"],
                videoUrl=v.get("video_url"),
            ),
            project=FeedProjectSummary(
                id=proj["id"],
                title=proj["title"],
                creatorName=creator_name,
                raisedCredits=stats["raised_credits"],
                goalCredits=proj["goal_credits"],
                backerCount=stats["backer_count"],
            ),
            interaction=FeedInteraction(**inter),
        ))

    return items


@router.post("/interactions")
async def record_interaction(req: RecordInteractionRequest, user: CurrentUser):
    if req.type not in ("like", "dislike", "view"):
        return {"success": False, "error": "Invalid interaction type"}

    # Upsert: if like/dislike already exists, this is a toggle-off scenario
    # For like/dislike, remove the opposite if it exists
    if req.type in ("like", "dislike"):
        opposite = "dislike" if req.type == "like" else "like"
        user.client.table("video_interactions").delete().eq("user_id", user.id).eq("video_id", req.videoId).eq("interaction_type", opposite).execute()

    # Try insert; if unique constraint fails, delete (toggle off)
    try:
        user.client.table("video_interactions").insert({
            "user_id": user.id,
            "video_id": req.videoId,
            "interaction_type": req.type,
        }).execute()
    except Exception:
        # Already exists — for like/dislike this means toggle off
        if req.type in ("like", "dislike"):
            user.client.table("video_interactions").delete().eq("user_id", user.id).eq("video_id", req.videoId).eq("interaction_type", req.type).execute()

    return {"success": True}
