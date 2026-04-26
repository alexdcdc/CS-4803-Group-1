from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, OptionalUser
from app.models.comment import CommentOut, CreateCommentRequest
from app.services.supabase_client import get_supabase_client

router = APIRouter()


def _row_to_out(row: dict) -> CommentOut:
    profile = row.get("profiles") or {}
    return CommentOut(
        id=row["id"],
        videoId=row["video_id"],
        userId=row["user_id"],
        userName=profile.get("name") or "Unknown",
        text=row["text"],
        createdAt=row["created_at"],
    )


@router.get("/{video_id}/comments", response_model=list[CommentOut])
async def list_comments(video_id: str, user: OptionalUser):
    client = user.client if user else get_supabase_client()
    resp = (
        client.table("video_comments")
        .select("*, profiles(name)")
        .eq("video_id", video_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_row_to_out(r) for r in resp.data]


@router.post("/{video_id}/comments", response_model=CommentOut)
async def create_comment(video_id: str, req: CreateCommentRequest, user: CurrentUser):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty comment")

    # Verify the video exists (anon-readable). Otherwise the FK would fail with
    # a less helpful error.
    video = (
        get_supabase_client()
        .table("project_videos")
        .select("id")
        .eq("id", video_id)
        .maybe_single()
        .execute()
    )
    if not video or not video.data:
        raise HTTPException(status_code=404, detail="Video not found")

    inserted = (
        user.client.table("video_comments")
        .insert({"video_id": video_id, "user_id": user.id, "text": text})
        .execute()
    )
    new_id = inserted.data[0]["id"]

    # Re-select with the joined profile so the response includes userName.
    full = (
        user.client.table("video_comments")
        .select("*, profiles(name)")
        .eq("id", new_id)
        .single()
        .execute()
    )
    return _row_to_out(full.data)


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: CurrentUser):
    # RLS silently filters non-owner deletes to a no-op. Look up the row first
    # so we can return a clear 403 instead of a confusing 404.
    existing = (
        user.client.table("video_comments")
        .select("id, user_id")
        .eq("id", comment_id)
        .maybe_single()
        .execute()
    )
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Comment not found")
    if existing.data["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not the comment author")

    user.client.table("video_comments").delete().eq("id", comment_id).execute()
    return {"success": True}
