from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.models.feed import FeedInteraction, FeedItem, FeedProjectSummary, RecordInteractionRequest
from app.routers.projects import _video_to_out
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.get("", response_model=list[FeedItem])
async def get_feed(user: CurrentUser, limit: int = 10, offset: int = 0):
    client = user.client

    # Fetch videos with their project info, then dedupe to one per project so
    # the feed surfaces each campaign exactly once. The "already seen" filter
    # (excluding disliked videos) is disabled for now so the infinite-loop feed
    # always cycles the full set.
    anon = get_supabase_client()
    query = anon.table("project_videos").select("*, projects(*, profiles(name))")

    # Pull a wider page than `limit` so dedupe-by-project still yields enough rows.
    videos_resp = query.limit(max(limit * 5, 100)).execute()

    if not videos_resp.data:
        return []

    seen_projects: set[str] = set()
    unique_videos = []
    for v in videos_resp.data:
        proj = v.get("projects")
        if not proj:
            continue
        if proj["id"] in seen_projects:
            continue
        seen_projects.add(proj["id"])
        unique_videos.append(v)

    # Apply limit/offset on the deduped list.
    unique_videos = unique_videos[offset : offset + limit]
    if not unique_videos:
        return []
    videos_resp.data = unique_videos

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

    # Tally comment counts per video. supabase-py doesn't support per-group
    # aggregates, so pull rows and count in Python (fine at current scale).
    comment_counts: dict[str, int] = {}
    if video_ids:
        comments_resp = anon.table("video_comments").select("video_id").in_("video_id", video_ids).execute()
        for c in comments_resp.data:
            comment_counts[c["video_id"]] = comment_counts.get(c["video_id"], 0) + 1

    # Tally like/dislike totals across all users for these videos.
    like_counts: dict[str, int] = {}
    dislike_counts: dict[str, int] = {}
    if video_ids:
        all_interactions_resp = anon.table("video_interactions").select("video_id, interaction_type").in_("video_id", video_ids).execute()
        for row in all_interactions_resp.data:
            vid = row["video_id"]
            if row["interaction_type"] == "like":
                like_counts[vid] = like_counts.get(vid, 0) + 1
            elif row["interaction_type"] == "dislike":
                dislike_counts[vid] = dislike_counts.get(vid, 0) + 1

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
            video=_video_to_out(v),
            project=FeedProjectSummary(
                id=proj["id"],
                title=proj["title"],
                creatorName=creator_name,
                raisedCredits=stats["raised_credits"],
                goalCredits=proj["goal_credits"],
                backerCount=stats["backer_count"],
            ),
            interaction=FeedInteraction(**inter),
            commentCount=comment_counts.get(v["id"], 0),
            likeCount=like_counts.get(v["id"], 0),
            dislikeCount=dislike_counts.get(v["id"], 0),
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
