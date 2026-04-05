from supabase import Client, ClientOptions, create_client

from app.config import settings


def get_supabase_client(access_token: str | None = None) -> Client:
    """Create a Supabase client.

    If access_token is provided, creates an authenticated client that acts
    as the user (respects RLS). Otherwise uses the anon key.
    """
    if access_token:
        return create_client(
            settings.supabase_url,
            settings.supabase_anon_key,
            options=ClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
        )
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin() -> Client:
    """Create a Supabase client with the service role key (bypasses RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
