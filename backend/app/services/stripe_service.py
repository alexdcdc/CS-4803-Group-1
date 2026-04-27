import httpx
import stripe
from fastapi import HTTPException, status

from app.config import settings

MIN_CREDIT_PURCHASE = 50
MAX_CREDIT_PURCHASE = 100_000


def credits_to_cents(credits: int) -> int:
    return credits


stripe.api_key = settings.stripe_secret_key
stripe.api_version = settings.stripe_api_version


def _url_with_query(base_url: str, path: str, query: str) -> str:
    base = base_url.rstrip("/")
    if not base.endswith(path):
        base = f"{base}{path}"
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}{query}"


def require_stripe_config() -> None:
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured",
        )


def create_checkout_session(
    user_id: str,
    email: str,
    credits: int,
    return_url: str | None = None,
) -> stripe.checkout.Session:
    require_stripe_config()
    if credits < MIN_CREDIT_PURCHASE or credits > MAX_CREDIT_PURCHASE:
        raise HTTPException(
            status_code=400,
            detail=f"Credit amount must be between {MIN_CREDIT_PURCHASE} and {MAX_CREDIT_PURCHASE}",
        )
    amount_cents = credits_to_cents(credits)

    base_return_url = (return_url or f"{settings.web_return_url.rstrip('/')}/recharge").rstrip("/")
    separator = "&" if "?" in base_return_url else "?"
    success_url = f"{base_return_url}{separator}status=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base_return_url}{separator}status=cancelled"

    return stripe.checkout.Session.create(
        mode="payment",
        customer_email=email,
        client_reference_id=user_id,
        success_url=success_url,
        cancel_url=cancel_url,
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {"name": f"{credits} Quickstarter credits"},
                },
            }
        ],
        metadata={"user_id": user_id, "credits": str(credits)},
    )


def construct_webhook_event(payload: bytes, signature: str) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe webhook secret is not configured",
        )
    try:
        return stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")


async def _stripe_v2_request(method: str, path: str, payload: dict | None = None) -> dict:
    require_stripe_config()
    headers = {
        "Authorization": f"Bearer {settings.stripe_secret_key}",
        "Stripe-Version": settings.stripe_api_version,
    }
    timeout = httpx.Timeout(connect=5, read=20, write=10, pool=5)
    try:
        async with httpx.AsyncClient(base_url="https://api.stripe.com", timeout=timeout) as client:
            response = await client.request(method, path, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"Timed out calling Stripe {method} {path}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe request failed: {exc}")
    if response.status_code >= 400:
        try:
            error = response.json().get("error", {})
        except ValueError:
            error = {"message": response.text}
        message = error.get("message") or response.text or "Stripe request failed"
        code = error.get("code")
        detail = f"Stripe API error: {message}"
        if code:
            detail = f"{detail} ({code})"
        raise HTTPException(status_code=400 if response.status_code < 500 else 502, detail=detail)
    return response.json()


async def create_recipient_account(email: str, display_name: str, user_id: str) -> dict:
    payload = {
        "contact_email": email,
        "display_name": display_name,
        "identity": {
            "country": settings.stripe_connect_country,
            "entity_type": "individual",
            "individual": {
                "email": email,
            },
        },
        "dashboard": "express",
        "configuration": {
            "recipient": {
                "capabilities": {
                    "stripe_balance": {
                        "stripe_transfers": {"requested": True},
                    },
                },
            },
        },
        "defaults": {
            "currency": "usd",
            "responsibilities": {
                "fees_collector": "application",
                "losses_collector": "application",
            },
        },
        "metadata": {"user_id": user_id},
        "include": ["configuration.recipient", "requirements"],
    }
    return await _stripe_v2_request("POST", "/v2/core/accounts", payload)


async def retrieve_account(account_id: str) -> dict:
    return await _stripe_v2_request(
        "GET",
        f"/v2/core/accounts/{account_id}?include[0]=configuration.recipient&include[1]=future_requirements",
    )


async def create_onboarding_link(account_id: str) -> dict:
    refresh_url = _url_with_query(settings.web_return_url, "/wallet", "stripe_connect=refresh")
    return_url = _url_with_query(settings.web_return_url, "/wallet", "stripe_connect=return")
    payload = {
        "account": account_id,
        "use_case": {
            "type": "account_onboarding",
            "account_onboarding": {
                "configurations": ["recipient"],
                "refresh_url": refresh_url,
                "return_url": return_url,
                "collection_options": {
                    "fields": "eventually_due",
                    "future_requirements": "include",
                },
            },
        },
    }
    try:
        return await _stripe_v2_request("POST", "/v2/core/account_links", payload)
    except HTTPException as exc:
        if exc.status_code != 504:
            raise

    try:
        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
            collection_options={"fields": "eventually_due"},
        )
        return {"url": link.url}
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe account link fallback failed: {exc.user_message or str(exc)}")


def recipient_status(account: dict | None) -> tuple[str, list[str]]:
    if not account:
        return "not_started", []

    recipient = (account.get("configuration") or {}).get("recipient") or {}
    balance = ((recipient.get("capabilities") or {}).get("stripe_balance")) or {}
    transfers = (balance.get("stripe_transfers") or {}).get("status")
    payouts = (balance.get("payouts") or {}).get("status")
    requirements = account.get("requirements") or {}
    due = [
        entry.get("description") or entry.get("reference", {}).get("type") or "Requirement due"
        for entry in requirements.get("entries", []) or []
    ]

    if transfers == "active":
        status_value = "active" if payouts in ("active", None) else "transfers_active"
    elif transfers in ("pending", "restricted", "unsupported"):
        status_value = transfers
    else:
        status_value = "restricted"
    return status_value, due


def create_transfer(destination_account_id: str, amount_cents: int, creator_id: str) -> stripe.Transfer:
    require_stripe_config()
    return stripe.Transfer.create(
        amount=amount_cents,
        currency="usd",
        destination=destination_account_id,
        metadata={"creator_id": creator_id, "credits": str(amount_cents)},
    )
