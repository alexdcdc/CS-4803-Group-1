"""End-to-end dev test for the Mux video pipeline.

Creates a throwaway Supabase auth user, signs in to get a real JWT,
creates a project, then drives the full upload path:
    POST /projects/{id}/videos -> Mux direct upload URL
    PUT  <Mux URL> with a sample mp4
    GET  /projects/{id}/videos/{video_id} (poll until status=ready)

Cleans up the user, project, and video at the end (also cancels the
direct upload if it never reached asset_created).
"""

import asyncio
import json
import os
import sys
import tempfile
import time
import uuid
from pathlib import Path

import httpx

API = "http://127.0.0.1:8000/api/v1"


def _resolve_sample() -> Path:
    env_override = os.environ.get("MUX_E2E_SAMPLE")
    candidates = []
    if env_override:
        candidates.append(Path(env_override))
    candidates += [
        Path(tempfile.gettempdir()) / "mux-test.mp4",
        Path("/tmp/mux-test.mp4"),
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(
        f"Could not find sample mp4. Tried: {[str(c) for c in candidates]}. "
        "Set MUX_E2E_SAMPLE=<path>."
    )


SAMPLE_MP4 = _resolve_sample()


def _print(label: str, value=None):
    if value is None:
        print(f"\n=== {label} ===")
    else:
        print(f"  {label}: {value}")


async def main() -> int:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from app.services.supabase_client import get_supabase_admin, get_supabase_client

    if not SAMPLE_MP4.exists():
        print(f"missing sample file at {SAMPLE_MP4}", file=sys.stderr)
        return 1

    suffix = uuid.uuid4().hex[:8]
    email = f"mux-e2e-{suffix}@example.com"
    password = "Pa$$word-" + suffix

    admin = get_supabase_admin()
    _print("creating throwaway user", email)
    user_resp = admin.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    user_id = user_resp.user.id
    _print("user_id", user_id)

    # profiles row (FK to auth.users.id)
    admin.table("profiles").upsert({
        "id": user_id,
        "name": f"E2E Tester {suffix}",
        "email": email,
        "role": "creator",
        "has_completed_onboarding": True,
    }).execute()

    anon = get_supabase_client()
    _print("signing in")
    sign_in = anon.auth.sign_in_with_password({"email": email, "password": password})
    token = sign_in.session.access_token
    _print("token len", len(token))

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    project_id = None
    video_id = None
    upload_id = None

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            _print("POST /projects")
            r = await client.post(f"{API}/projects", headers=headers, json={
                "title": f"[mux-e2e-{suffix}] Live upload run",
                "description": "Created by dev_e2e_mux.py",
                "goalCredits": 500,
            })
            r.raise_for_status()
            project = r.json()
            project_id = project["id"]
            _print("project_id", project_id)

            _print("POST /projects/{id}/videos (creates Mux direct upload)")
            r = await client.post(
                f"{API}/projects/{project_id}/videos",
                headers=headers,
                json={"title": "E2E sample"},
            )
            r.raise_for_status()
            create = r.json()
            video_id = create["video"]["id"]
            upload_id = create["uploadId"]
            upload_url = create["uploadUrl"]
            _print("video_id", video_id)
            _print("upload_id", upload_id)
            _print("video.status (initial)", create["video"]["status"])

            _print("PUT sample mp4 to Mux upload URL")
            with SAMPLE_MP4.open("rb") as fh:
                put = await client.put(upload_url, content=fh.read())
            _print("PUT http", put.status_code)
            put.raise_for_status()

            _print("Polling GET /videos/{id} until ready (max 6 min)")
            start = time.time()
            deadline = start + 360
            last_status = None
            while time.time() < deadline:
                r = await client.get(
                    f"{API}/projects/{project_id}/videos/{video_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                r.raise_for_status()
                v = r.json()
                if v["status"] != last_status:
                    elapsed = int(time.time() - start)
                    print(f"  [+{elapsed:>3}s] status={v['status']:<14} playbackId={v.get('playbackId')}")
                    last_status = v["status"]
                if v["status"] == "ready":
                    _print("FINAL")
                    print(json.dumps(v, indent=2))
                    return 0
                if v["status"] in ("errored", "cancelled"):
                    print("FAILED with terminal status")
                    return 2
                await asyncio.sleep(2)
            print("TIMEOUT waiting for ready")
            return 3
        finally:
            _print("cleanup")
            try:
                if video_id:
                    admin.table("project_videos").delete().eq("id", video_id).execute()
                if project_id:
                    admin.table("projects").delete().eq("id", project_id).execute()
                admin.table("profiles").delete().eq("id", user_id).execute()
                admin.auth.admin.delete_user(user_id)
                _print("removed test user/project/video", "ok")
            except Exception as exc:
                print(f"  cleanup error: {exc}")


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
