from fastapi import APIRouter, Header, Request

from app.services.stripe_service import construct_webhook_event
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(alias="Stripe-Signature")):
    payload = await request.body()
    event = construct_webhook_event(payload, stripe_signature)
    admin = get_supabase_admin()

    event_id = event["id"]
    existing = admin.table("stripe_webhook_events").select("id").eq("id", event_id).execute()
    if existing.data:
        return {"received": True, "duplicate": True}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
        credits = int((session.get("metadata") or {}).get("credits", "0"))
        session_id = session["id"]
        payment_intent = session.get("payment_intent")

        checkout = (
            admin.table("stripe_checkout_sessions")
            .select("*")
            .eq("stripe_session_id", session_id)
            .single()
            .execute()
        )
        if checkout.data and checkout.data["status"] != "paid":
            tx = admin.table("transactions").insert({
                "user_id": user_id,
                "type": "recharge",
                "amount": credits,
                "label": f"Bought {credits} credits",
            }).execute()
            admin.table("stripe_checkout_sessions").update({
                "status": "paid",
                "stripe_payment_intent_id": payment_intent,
                "transaction_id": tx.data[0]["id"],
            }).eq("stripe_session_id", session_id).execute()

    admin.table("stripe_webhook_events").insert({
        "id": event_id,
        "event_type": event["type"],
    }).execute()

    return {"received": True}
