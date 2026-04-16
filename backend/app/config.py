from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_public_key: str = ""
    stripe_api_version: str = "2026-03-25.dahlia"
    stripe_connect_country: str = "US"
    app_return_url: str = "quickstarter://wallet"
    web_return_url: str = "http://localhost:8081"

    model_config = {"env_file": ".env"}


settings = Settings()  # type: ignore[call-arg]
