import hashlib
import hmac
import time

import httpx
from fastapi import HTTPException, status

from app.config import settings

MUX_API_BASE = "https://api.mux.com"
PLAYBACK_BASE = "https://stream.mux.com"
THUMBNAIL_BASE = "https://image.mux.com"


def require_mux_config() -> None:
    if not settings.mux_token_id or not settings.mux_token_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mux is not configured",
        )


def _auth() -> tuple[str, str]:
    return (settings.mux_token_id, settings.mux_token_secret)


async def _request(method: str, path: str, payload: dict | None = None) -> dict:
    require_mux_config()
    timeout = httpx.Timeout(connect=5, read=20, write=10, pool=5)
    try:
        async with httpx.AsyncClient(base_url=MUX_API_BASE, timeout=timeout, auth=_auth()) as client:
            response = await client.request(method, path, json=payload)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"Timed out calling Mux {method} {path}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Mux request failed: {exc}")

    if response.status_code >= 400:
        try:
            error = response.json().get("error", {})
        except ValueError:
            error = {"messages": [response.text]}
        messages = error.get("messages") or [response.text or "Mux request failed"]
        detail = f"Mux API error: {'; '.join(messages)}"
        raise HTTPException(status_code=400 if response.status_code < 500 else 502, detail=detail)

    return response.json().get("data", {})


async def create_direct_upload(passthrough: str | None = None) -> dict:
    """Create a Mux direct upload. Returns {id, url, status, asset_id?}."""
    payload: dict = {
        "cors_origin": settings.mux_cors_origin,
        "new_asset_settings": {
            "playback_policy": [settings.mux_playback_policy],
            "video_quality": "basic",
        },
    }
    if passthrough:
        payload["new_asset_settings"]["passthrough"] = passthrough
    return await _request("POST", "/video/v1/uploads", payload)


async def get_upload(upload_id: str) -> dict:
    return await _request("GET", f"/video/v1/uploads/{upload_id}")


async def get_asset(asset_id: str) -> dict:
    return await _request("GET", f"/video/v1/assets/{asset_id}")


def playback_url(playback_id: str) -> str:
    return f"{PLAYBACK_BASE}/{playback_id}.m3u8"


def thumbnail_url(playback_id: str, time_seconds: float = 0.0) -> str:
    return f"{THUMBNAIL_BASE}/{playback_id}/thumbnail.jpg?time={time_seconds}"


def _public_playback_id(asset: dict) -> str | None:
    """Pick the first public playback id from an asset payload."""
    for pb in asset.get("playback_ids") or []:
        if pb.get("policy") == "public":
            return pb.get("id")
    pbs = asset.get("playback_ids") or []
    return pbs[0]["id"] if pbs else None


def derive_status(mux_status: str | None, asset_status: str | None = None) -> str:
    """Map Mux upload/asset status into our DB enum."""
    if asset_status == "ready":
        return "ready"
    if asset_status == "errored":
        return "errored"
    if asset_status == "preparing":
        return "preparing"
    if mux_status == "asset_created":
        return "asset_created"
    if mux_status == "errored":
        return "errored"
    if mux_status == "cancelled":
        return "cancelled"
    if mux_status == "timed_out":
        return "errored"
    return "pending"


def asset_summary(asset: dict) -> dict:
    """Extract the fields we persist from a Mux asset payload."""
    return {
        "asset_id": asset.get("id"),
        "playback_id": _public_playback_id(asset),
        "status": derive_status(None, asset.get("status")),
        "duration_seconds": asset.get("duration"),
    }


def verify_webhook_signature(payload: bytes, signature_header: str, tolerance_seconds: int = 300) -> None:
    """Verify a Mux webhook signature header (`Mux-Signature: t=..,v1=..`)."""
    if not settings.mux_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mux webhook secret is not configured",
        )
    if not signature_header:
        raise HTTPException(status_code=400, detail="Missing Mux-Signature header")

    parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
    timestamp = parts.get("t")
    signature = parts.get("v1")
    if not timestamp or not signature:
        raise HTTPException(status_code=400, detail="Malformed Mux-Signature header")

    try:
        ts_int = int(timestamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Mux-Signature timestamp")

    if abs(time.time() - ts_int) > tolerance_seconds:
        raise HTTPException(status_code=400, detail="Mux webhook timestamp outside tolerance")

    signed_payload = f"{timestamp}.".encode() + payload
    expected = hmac.new(
        settings.mux_webhook_secret.encode(),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid Mux webhook signature")
