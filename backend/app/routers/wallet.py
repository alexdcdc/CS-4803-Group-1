from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import CurrentUser
from app.models.project import RewardOut

router = APIRouter()


class DonateRequest(BaseModel):
    projectId: str
    amount: int


class DonateResponse(BaseModel):
    success: bool
    rewardsUnlocked: list[RewardOut] = []


class RechargeRequest(BaseModel):
    amount: int


class ConvertRequest(BaseModel):
    amount: int


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


@router.post("/recharge")
async def recharge(req: RechargeRequest, user: CurrentUser):
    user.client.table("transactions").insert({
        "user_id": user.id,
        "type": "recharge",
        "amount": req.amount,
        "label": f"Recharged {req.amount} credits",
    }).execute()
    return {"success": True}


@router.post("/convert")
async def convert(req: ConvertRequest, user: CurrentUser):
    # Verify balance
    txns = user.client.table("transactions").select("amount").eq("user_id", user.id).execute()
    balance = sum(t["amount"] for t in txns.data)

    if balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    dollar_amount = req.amount / 100

    user.client.table("transactions").insert({
        "user_id": user.id,
        "type": "payout",
        "amount": -req.amount,
        "label": f"Converted {req.amount} credits to ${dollar_amount:.2f}",
    }).execute()

    return {"dollarAmount": dollar_amount}


@router.get("/earnings")
async def get_earnings(user: CurrentUser):
    # Get all projects owned by user
    projects = user.client.table("projects").select("id").eq("creator_id", user.id).execute()
    if not projects.data:
        return {"earnings": 0}

    project_ids = [p["id"] for p in projects.data]
    stats = user.client.table("project_stats").select("raised_credits").in_("project_id", project_ids).execute()

    total = sum(s["raised_credits"] for s in stats.data)
    return {"earnings": total}
