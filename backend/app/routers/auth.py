from fastapi import APIRouter, HTTPException

from app.dependencies import AdminClient, CurrentUser
from app.models.user import (
    ForgotPasswordRequest,
    LoginRequest,
    SignupRequest,
    UpdateAccountRequest,
)
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.post("/signup")
async def signup(req: SignupRequest):
    client = get_supabase_client()
    try:
        resp = client.auth.sign_up(
            {"email": req.email, "password": req.password, "options": {"data": {"name": req.name}}}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}
    if resp.user is None:
        return {"success": False, "error": "Signup failed"}
    return {
        "success": True,
        "session": {
            "access_token": resp.session.access_token if resp.session else None,
            "refresh_token": resp.session.refresh_token if resp.session else None,
        },
    }


@router.post("/login")
async def login(req: LoginRequest):
    client = get_supabase_client()
    try:
        resp = client.auth.sign_in_with_password({"email": req.email, "password": req.password})
    except Exception as e:
        return {"success": False, "error": "Invalid email or password"}
    if resp.session is None:
        return {"success": False, "error": "Invalid email or password"}
    return {
        "success": True,
        "session": {
            "access_token": resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        },
    }


@router.post("/logout")
async def logout(user: CurrentUser):
    try:
        user.client.auth.sign_out()
    except Exception:
        pass
    return {"success": True}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    client = get_supabase_client()
    try:
        client.auth.reset_password_email(req.email)
    except Exception:
        pass
    return {"success": True}


@router.put("/account")
async def update_account(req: UpdateAccountRequest, user: CurrentUser, admin: AdminClient):
    # Update profile fields
    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.email is not None:
        updates["email"] = req.email

    if updates:
        user.client.table("profiles").update(updates).eq("id", user.id).execute()

    # Update auth email if changed
    if req.email is not None:
        try:
            admin.auth.admin.update_user_by_id(user.id, {"email": req.email})
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Update password if requested
    if req.newPassword:
        try:
            admin.auth.admin.update_user_by_id(user.id, {"password": req.newPassword})
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": True}


@router.delete("/account")
async def delete_account(user: CurrentUser, admin: AdminClient):
    try:
        admin.auth.admin.delete_user(user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}
