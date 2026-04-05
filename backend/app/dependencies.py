from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from supabase import Client

from app.services.supabase_client import get_supabase_admin, get_supabase_client


class AuthenticatedUser:
    def __init__(self, id: str, token: str, client: Client):
        self.id = id
        self.token = token
        self.client = client


def _extract_token(authorization: str = Header()) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    return authorization[7:]


async def get_current_user(authorization: str = Header()) -> AuthenticatedUser:
    token = _extract_token(authorization)
    admin = get_supabase_admin()
    try:
        resp = admin.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if not resp or not resp.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    client = get_supabase_client(token)
    return AuthenticatedUser(id=resp.user.id, token=token, client=client)


async def get_current_user_optional(authorization: str | None = Header(default=None)) -> AuthenticatedUser | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
OptionalUser = Annotated[AuthenticatedUser | None, Depends(get_current_user_optional)]
AdminClient = Annotated[Client, Depends(lambda: get_supabase_admin())]
