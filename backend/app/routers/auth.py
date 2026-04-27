from fastapi import APIRouter, HTTPException, status
from supabase import Client

from app.dependencies import AdminClient, AuthenticatedUser, CurrentUser
from app.models.user import (
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    SignupRequest,
    UpdateAccountRequest,
)
from app.services.supabase_client import get_supabase_client

router = APIRouter()


def _verify_password(user: AuthenticatedUser, admin: Client, password: str) -> None:
    """Re-authenticate the user by signing in with their current email + password.

    Raises 401 on failure. Used to gate destructive actions (password change,
    account deletion) so a stolen session alone isn't enough.
    """
    try:
        account = admin.auth.admin.get_user_by_id(user.id)
        current_email = account.user.email if account and account.user else None
    except Exception:
        current_email = None
    if not current_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not verify identity"
        )
    verify_client = get_supabase_client()
    try:
        verify = verify_client.auth.sign_in_with_password(
            {"email": current_email, "password": password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password"
        )
    if verify.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password"
        )


@router.post("/signup")
async def signup(req: SignupRequest):
    client = get_supabase_client()
    try:
        resp = client.auth.sign_up(
            {"email": req.email, "password": req.password, "options": {"data": {"name": req.name}}}
        )
    except Exception:
        # Don't echo the upstream exception — it can leak schema/config details.
        return {"success": False, "error": "Signup failed"}
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
    except Exception:
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
    # Swallow errors so we don't expose whether an email exists in the system.
    try:
        client.auth.reset_password_email(req.email)
    except Exception:
        pass
    return {"success": True}


@router.put("/account")
async def update_account(req: UpdateAccountRequest, user: CurrentUser, admin: AdminClient):
    # Password change requires proof of the current password even when the user
    # already holds a valid session — protects against session theft.
    if req.newPassword:
        if not req.currentPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Current password required"
            )
        _verify_password(user, admin, req.currentPassword)

    if req.name is not None:
        user.client.table("profiles").update({"name": req.name}).eq("id", user.id).execute()

    # Email change goes through the user-scoped client so Supabase sends the
    # standard confirmation flow (verify new address, notify old). Bypassing
    # this with the admin API would let a stolen session silently re-point the
    # account.
    if req.email is not None:
        try:
            user.client.auth.update_user({"email": req.email})
        except Exception:
            return {"success": False, "error": "Could not update email"}
        user.client.table("profiles").update({"email": req.email}).eq("id", user.id).execute()

    if req.newPassword:
        try:
            admin.auth.admin.update_user_by_id(user.id, {"password": req.newPassword})
        except Exception:
            return {"success": False, "error": "Could not update password"}

    return {"success": True}


@router.delete("/account")
async def delete_account(req: DeleteAccountRequest, user: CurrentUser, admin: AdminClient):
    # Re-auth: a stolen session alone must not be enough to nuke an account.
    if not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password required"
        )
    _verify_password(user, admin, req.password)
    try:
        admin.auth.admin.delete_user(user.id)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not delete account")
    return {"success": True}
