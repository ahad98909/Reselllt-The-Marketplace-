import stripe
from typing import Dict, Any, Tuple
from app.core.config import settings

# Initialize Stripe if key is provided
if settings.STRIPE_API_KEY:
    stripe.api_key = settings.STRIPE_API_KEY
    STRIPE_ACTIVE = True
else:
    STRIPE_ACTIVE = False

def create_checkout_session(
    product_id: int, 
    title: str, 
    amount: float, 
    buyer_id: int, 
    success_url: str, 
    cancel_url: str
) -> Tuple[str, str]:
    """
    Creates a Stripe Checkout Session.
    Returns (session_url, session_id).
    Falls back to a frontend mock checkout simulator if Stripe is not active.
    """
    if STRIPE_ACTIVE:
        try:
            # Amount must be integer in cents for Stripe
            amount_cents = int(amount * 100)
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': title,
                            'description': f"Purchase of {title} on Marketplace",
                        },
                        'unit_amount': amount_cents,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                metadata={
                    "product_id": str(product_id),
                    "buyer_id": str(buyer_id)
                }
            )
            return session.url, session.id
        except Exception as e:
            print(f"Stripe Session creation failed: {e}. Falling back to mock payments.")
            pass

    # Mock checkout URL path pointing to our frontend mock checkout page
    # The frontend will hit the callback endpoint to trigger transaction creation
    mock_session_id = f"mock_stripe_sess_{product_id}_{buyer_id}"
    mock_url = f"/checkout/mock?session_id={mock_session_id}&product_id={product_id}&amount={amount}&buyer_id={buyer_id}"
    return mock_url, mock_session_id

def verify_webhook(payload: bytes, sig_header: str) -> Dict[str, Any]:
    """
    Verifies Stripe webhook signature.
    """
    if STRIPE_ACTIVE and settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except Exception as e:
            raise ValueError(f"Webhook verification failed: {e}")
    else:
        # Mock webhook bypass/validation
        raise ValueError("Stripe webhook verification not configured or bypassed.")
