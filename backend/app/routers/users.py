from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.models.user import SetRoleRequest, TransactionOut, UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(user: CurrentUser):
    # Get profile
    profile = user.client.table("profiles").select("*").eq("id", user.id).single().execute()
    p = profile.data

    # Get all transactions to compute balance and return history
    txns = user.client.table("transactions").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()

    credit_balance = sum(t["amount"] for t in txns.data)

    transactions = [
        TransactionOut(
            id=t["id"],
            type=t["type"],
            amount=t["amount"],
            label=t["label"],
            date=t["created_at"][:10],
        )
        for t in txns.data
    ]

    return UserOut(
        id=p["id"],
        name=p["name"],
        email=p["email"],
        creditBalance=credit_balance,
        transactions=transactions,
        role=p["role"],
        hasCompletedOnboarding=p["has_completed_onboarding"],
    )


@router.put("/me/role")
async def set_role(req: SetRoleRequest, user: CurrentUser):
    user.client.table("profiles").update({
        "role": req.role,
        "has_completed_onboarding": True,
    }).eq("id", user.id).execute()
    return {"success": True}


@router.post("/me/toggle-role")
async def toggle_role(user: CurrentUser):
    profile = user.client.table("profiles").select("role").eq("id", user.id).single().execute()
    current = profile.data["role"]
    new_role = "creator" if current == "backer" else "backer"
    user.client.table("profiles").update({"role": new_role}).eq("id", user.id).execute()
    return {"role": new_role}
