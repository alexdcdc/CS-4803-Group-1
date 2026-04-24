from fastapi import APIRouter, Header, Request

from app.services import mux_service
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


def _find_video_row(admin, data: dict, passthrough: str | None) -> dict | None:
    if passthrough:
        resp = admin.table("project_videos").select("*").eq("id", passthrough).limit(1).execute()
        if resp.data:
            return resp.data[0]

    upload_id = data.get("upload_id")
    if upload_id:
        resp = admin.table("project_videos").select("*").eq("upload_id", upload_id).limit(1).execute()
        if resp.data:
            return resp.data[0]

    asset_id = data.get("id") if data.get("object", {}).get("type") == "asset" else data.get("asset_id")
    if asset_id:
        resp = admin.table("project_videos").select("*").eq("asset_id", asset_id).limit(1).execute()
        if resp.data:
            return resp.data[0]

    return None


@router.post("/webhook")
async def mux_webhook(request: Request, mux_signature: str = Header(alias="Mux-Signature")):
    payload = await request.body()
    mux_service.verify_webhook_signature(payload, mux_signature)
    event = await request.json()

    event_id = event.get("id") or ""
    event_type = event.get("type") or ""
    data = event.get("data") or {}
    admin = get_supabase_admin()

    if event_id:
        existing = admin.table("mux_webhook_events").select("id").eq("id", event_id).execute()
        if existing.data:
            return {"received": True, "duplicate": True}

    passthrough = (
        data.get("passthrough")
        or (data.get("new_asset_settings") or {}).get("passthrough")
    )
    video = _find_video_row(admin, data, passthrough)

    if video:
        updates: dict = {}

        if event_type == "video.upload.asset_created":
            asset_id = data.get("asset_id") or data.get("asset", {}).get("id")
            if asset_id and asset_id != video.get("asset_id"):
                updates["asset_id"] = asset_id
            updates.setdefault("status", "asset_created")

        elif event_type in ("video.asset.created", "video.asset.ready", "video.asset.errored", "video.asset.updated"):
            summary = mux_service.asset_summary(data)
            for key in ("asset_id", "playback_id", "status", "duration_seconds"):
                value = summary.get(key)
                if value is not None and value != video.get(key):
                    updates[key] = value

        elif event_type == "video.upload.cancelled":
            updates["status"] = "cancelled"

        elif event_type == "video.upload.errored":
            updates["status"] = "errored"

        if updates:
            admin.table("project_videos").update(updates).eq("id", video["id"]).execute()

    if event_id:
        admin.table("mux_webhook_events").insert({
            "id": event_id,
            "event_type": event_type,
        }).execute()

    return {"received": True}
