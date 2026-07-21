"""
Stripe Billing Router – Monetization, Checkout Sessions & Webhooks.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import User, UserPlan
from backend.api.auth import get_current_user
from backend.api.quotas import get_user_monthly_usage, TIER_LIMITS

try:
    import stripe  # type: ignore
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "sk_test_mock_secret_key")
except ImportError:
    stripe = None
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/billing", tags=["billing"])

class CheckoutRequest(BaseModel):
    plan_tier: str  # "pro" or "enterprise"

@router.get("/usage")
async def get_usage_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's monthly analysis usage and tier limits."""
    plan = current_user.plan_tier or UserPlan.FREE.value
    limits = TIER_LIMITS.get(plan, TIER_LIMITS[UserPlan.FREE.value])
    used = get_user_monthly_usage(current_user.id, db)
    
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "plan_tier": plan,
        "plan_name": limits["name"],
        "monthly_used": used,
        "monthly_limit": limits["monthly_analyses"],
        "remaining": max(0, limits["monthly_analyses"] - used),
        "max_loc_per_repo": limits["max_loc"],
    }

@router.post("/checkout")
async def create_checkout_session(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout Session for subscription upgrade."""
    if req.plan_tier not in (UserPlan.PRO.value, UserPlan.ENTERPRISE.value):
        raise HTTPException(status_code=400, detail="Invalid plan tier selected.")

    # Price IDs from env or default mock
    price_id = os.environ.get(
        f"STRIPE_PRICE_{req.plan_tier.upper()}",
        "price_mock_pro_tier_123"
    )

    if stripe is None or "sk_test_mock" in getattr(stripe, "api_key", "sk_test_mock"):
        return {
            "checkout_url": f"{FRONTEND_URL}/repos?mock_upgraded={req.plan_tier}",
            "session_id": "cs_mock_12345",
            "notice": "Mock Checkout Mode (Stripe SDK or Secret Key not configured)"
        }

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=current_user.email,
            client_reference_id=current_user.id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{FRONTEND_URL}/repos?checkout=success",
            cancel_url=f"{FRONTEND_URL}/billing?checkout=cancelled",
            metadata={"user_id": current_user.id, "target_plan": req.plan_tier},
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe Checkout Error: {str(e)}")

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe Webhook handler for automated subscription lifecycle events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    event = None
    if STRIPE_WEBHOOK_SECRET and sig_header:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook Signature Verification Failed: {e}")
    else:
        # Fallback parse for dev mode
        import json
        event = json.loads(payload.decode("utf-8"))

    event_type = event.get("type") if isinstance(event, dict) else event.type
    event_data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object

    if event_type == "checkout.session.completed":
        user_id = event_data.get("client_reference_id") or event_data.get("metadata", {}).get("user_id")
        target_plan = event_data.get("metadata", {}).get("target_plan", UserPlan.PRO.value)
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.plan_tier = target_plan
                db.commit()
                print(f"Stripe Billing: User {user.email} upgraded to {target_plan}.", flush=True)

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        status_val = event_data.get("status")
        customer_email = event_data.get("customer_email")
        if status_val == "canceled" and customer_email:
            user = db.query(User).filter(User.email == customer_email).first()
            if user:
                user.plan_tier = UserPlan.FREE.value
                db.commit()
                print(f"Stripe Billing: User {user.email} subscription canceled. Downgraded to free.", flush=True)

    return Response(status_code=200)
