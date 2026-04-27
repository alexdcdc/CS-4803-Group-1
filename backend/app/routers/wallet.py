from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import CurrentUser
from app.models.project import RewardOut
from app.services.stripe_service import (
    MAX_CREDIT_PURCHASE,
    MIN_CREDIT_PURCHASE,
    create_checkout_session,
    create_onboarding_link,
    create_recipient_account,
    create_transfer,
    credits_to_cents,
    recipient_status,
    retrieve_account,
)
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


class DonateRequest(BaseModel):
    projectId: str
    amount: int


class DonateResponse(BaseModel):
    success: bool
    rewardsUnlocked: list[RewardOut] = []


class RechargeRequest(BaseModel):
    credits: int
    returnUrl: str | None = None


class ConvertRequest(BaseModel):
    amount: int


class CheckoutSessionResponse(BaseModel):
    url: str
    sessionId: str


class ConnectStatusResponse(BaseModel):
    status: str
    requirementsDue: list[str] = []
    hasAccount: bool


class OnboardingLinkResponse(BaseModel):
    url: str


class EarningsResponse(BaseModel):
    earnings: int
    paidOut: int
    available: int


@router.post("/donate", response_model=DonateResponse)
async def donate(req: DonateRequest, user: CurrentUser):
    # Compute current balance
    txns = user.client.table("transactions").select("amount").eq("user_id", user.id).execute()
    balance = sum(t["amount"] for t in txns.data)

    if balance < req.amount:
        return DonateResponse(success=False)

    # Get project info
    project = user.client.table("projects").select("id, title").eq("id", req.projectId).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Insert transaction (negative amount for donation)
    tx_resp = user.client.table("transactions").insert({
        "user_id": user.id,
        "type": "donation",
        "amount": -req.amount,
        "label": f"Donated to {project.data['title']}",
        "project_id": req.projectId,
    }).execute()

    # Insert donation record
    user.client.table("donations").insert({
        "user_id": user.id,
        "project_id": req.projectId,
        "amount": req.amount,
        "transaction_id": tx_resp.data[0]["id"],
    }).execute()

    # Find unlocked rewards
    rewards = user.client.table("rewards").select("*").eq("project_id", req.projectId).lte("min_donation", req.amount).execute()

    unlocked = [
        RewardOut(
            id=r["id"],
            title=r["title"],
            description=r["description"],
            minDonation=r["min_donation"],
            fileName=r.get("file_name"),
        )
        for r in rewards.data
    ]

    return DonateResponse(success=True, rewardsUnlocked=unlocked)


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_credit_checkout_session(req: RechargeRequest, user: CurrentUser):
    if req.credits < MIN_CREDIT_PURCHASE or req.credits > MAX_CREDIT_PURCHASE:
        raise HTTPException(
            status_code=400,
            detail=f"Credit amount must be between {MIN_CREDIT_PURCHASE} and {MAX_CREDIT_PURCHASE}",
        )

    admin = get_supabase_admin()
    profile = admin.table("profiles").select("email").eq("id", user.id).single().execute()
    session = create_checkout_session(user.id, profile.data["email"], req.credits, req.returnUrl)

    admin.table("stripe_checkout_sessions").insert({
        "user_id": user.id,
        "stripe_session_id": session.id,
        "credits": req.credits,
        "amount_cents": credits_to_cents(req.credits),
        "status": "created",
    }).execute()

    return CheckoutSessionResponse(url=session.url, sessionId=session.id)


@router.post("/convert")
async def convert(req: ConvertRequest, user: CurrentUser):
    if req.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum cashout is 100 credits")

    admin = get_supabase_admin()
    status_resp = await get_connect_status(user)
    if status_resp.status != "active":
        raise HTTPException(status_code=400, detail="Complete Stripe onboarding before cashing out")

    earnings = _get_creator_earnings(admin, user.id)
    if earnings["available"] < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient creator earnings")

    profile = admin.table("profiles").select("stripe_account_id").eq("id", user.id).single().execute()
    stripe_account_id = profile.data["stripe_account_id"]
    transfer = create_transfer(stripe_account_id, req.amount, user.id)

    tx = admin.table("transactions").insert({
        "user_id": user.id,
        "type": "payout",
        "amount": -req.amount,
        "label": f"Cashed out {req.amount} credits",
    }).execute()

    admin.table("creator_payouts").insert({
        "creator_id": user.id,
        "credits": req.amount,
        "amount_cents": req.amount,
        "stripe_account_id": stripe_account_id,
        "stripe_transfer_id": transfer.id,
        "status": "transferred",
        "transaction_id": tx.data[0]["id"],
    }).execute()

    return {"dollarAmount": req.amount / 100}


def _get_creator_earnings(admin, user_id: str) -> dict[str, int]:
    # Get all projects owned by user
    projects = admin.table("projects").select("id").eq("creator_id", user_id).execute()
    if not projects.data:
        return {"earnings": 0, "paidOut": 0, "available": 0}

    project_ids = [p["id"] for p in projects.data]
    stats = admin.table("project_stats").select("raised_credits").in_("project_id", project_ids).execute()

    total = sum(s["raised_credits"] for s in stats.data)
    payouts = (
        admin.table("creator_payouts")
        .select("credits")
        .eq("creator_id", user_id)
        .in_("status", ["pending", "transferred"])
        .execute()
    )
    paid_out = sum(p["credits"] for p in payouts.data)
    return {"earnings": total, "paidOut": paid_out, "available": max(total - paid_out, 0)}


@router.get("/earnings", response_model=EarningsResponse)
async def get_earnings(user: CurrentUser):
    return EarningsResponse(**_get_creator_earnings(get_supabase_admin(), user.id))


@router.get("/connect/status", response_model=ConnectStatusResponse)
async def get_connect_status(user: CurrentUser):
    admin = get_supabase_admin()
    profile = (
        admin.table("profiles")
        .select("stripe_account_id, stripe_connect_status, stripe_connect_requirements_due")
        .eq("id", user.id)
        .single()
        .execute()
    )
    account_id = profile.data.get("stripe_account_id")
    if not account_id:
        return ConnectStatusResponse(status="not_started", requirementsDue=[], hasAccount=False)

    try:
        account = await retrieve_account(account_id)
        status_value, requirements_due = recipient_status(account)
        admin.table("profiles").update({
            "stripe_connect_status": status_value,
            "stripe_connect_requirements_due": requirements_due,
        }).eq("id", user.id).execute()
    except HTTPException as exc:
        if exc.status_code != 504:
            raise
        status_value = profile.data.get("stripe_connect_status") or "pending"
        requirements_due = profile.data.get("stripe_connect_requirements_due") or []

    return ConnectStatusResponse(
        status=status_value,
        requirementsDue=requirements_due,
        hasAccount=True,
    )


@router.post("/connect/onboarding-link", response_model=OnboardingLinkResponse)
async def create_connect_onboarding_link(user: CurrentUser):
    admin = get_supabase_admin()
    profile = admin.table("profiles").select("*").eq("id", user.id).single().execute()
    account_id = profile.data.get("stripe_account_id")

    if not account_id:
        account = await create_recipient_account(profile.data["email"], profile.data["name"], user.id)
        account_id = account["id"]
        status_value, requirements_due = recipient_status(account)
        admin.table("profiles").update({
            "stripe_account_id": account_id,
            "stripe_connect_status": status_value,
            "stripe_connect_requirements_due": requirements_due,
        }).eq("id", user.id).execute()

    link = await create_onboarding_link(account_id)
    return OnboardingLinkResponse(url=link["url"])
