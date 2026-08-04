from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.services import stripe_payment
from app.services.websocket import manager

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/checkout", response_model=dict)
def create_checkout(
    checkout_in: schemas.TransactionCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiates payment checkout session for purchasing an item
    """
    product = db.query(models.Product).filter(
        models.Product.id == checkout_in.product_id,
        models.Product.is_sold == False
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found or already sold")

    if product.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot purchase your own item")

    # Define return urls
    success_url = "http://localhost/transactions/success"
    cancel_url = "http://localhost/products/" + str(product.id)

    # Call stripe payment service
    session_url, session_id = stripe_payment.create_checkout_session(
        product_id=product.id,
        title=product.title,
        amount=float(product.price),
        buyer_id=current_user.id,
        success_url=success_url,
        cancel_url=cancel_url
    )

    return {
        "session_url": session_url,
        "session_id": session_id
    }

@router.post("/checkout-complete", response_model=schemas.TransactionResponse)
async def checkout_complete(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook/callback simulation triggered on successful checkout.
    Records transaction in escrow, updates listing as sold, and creates alerts.
    """
    product_id = int(payload.get("product_id"))
    buyer_id = int(payload.get("buyer_id"))
    session_id = payload.get("session_id", "mock_checkout_complete")

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.is_sold:
        # Check if transaction already registered
        existing_tx = db.query(models.Transaction).filter(
            models.Transaction.product_id == product_id
        ).first()
        if existing_tx:
            return existing_tx

    # Create Transaction (Escrowed)
    tx = models.Transaction(
        buyer_id=buyer_id,
        seller_id=product.seller_id,
        product_id=product_id,
        amount=product.price,
        status="escrow",
        stripe_payment_intent_id=session_id,
        shipping_address=payload.get("shipping_address")
    )
    db.add(tx)
    
    # Mark product sold
    product.is_sold = True
    db.commit()
    db.refresh(tx)

    # Trigger alerts/notifications
    notif_seller = models.Notification(
        user_id=product.seller_id,
        notification_type="offer",
        content=f"Your item '{product.title}' has been purchased! ${product.price} is now held in escrow. Please arrange fulfillment."
    )
    notif_buyer = models.Notification(
        user_id=buyer_id,
        notification_type="new_message",
        content=f"Payment of ${product.price} for '{product.title}' is successful. The funds are held in escrow until you release them."
    )
    db.add(notif_seller)
    db.add(notif_buyer)
    db.commit()

    # WebSocket pushes
    await manager.send_personal_message({
        "event": "notification",
        "data": {
            "type": "offer",
            "content": f"Your item '{product.title}' has been purchased! ${product.price} is now held in escrow."
        }
    }, product.seller_id)

    return tx

@router.get("/history", response_model=List[schemas.TransactionResponse])
def get_transaction_history(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's buying and selling transactions
    """
    txs = db.query(models.Transaction).filter(
        (models.Transaction.buyer_id == current_user.id) | 
        (models.Transaction.seller_id == current_user.id)
    ).order_by(models.Transaction.created_at.desc()).all()
    return txs

@router.post("/{transaction_id}/release", response_model=schemas.TransactionResponse)
async def release_escrow(
    transaction_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows the buyer to release escrowed funds to the seller once the item is received.
    """
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.buyer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the buyer can release the escrowed funds")

    if tx.status != "escrow":
        raise HTTPException(status_code=400, detail="Funds have already been released or refunded")

    tx.status = "released"
    db.commit()
    db.refresh(tx)

    # Notify Seller
    notif = models.Notification(
        user_id=tx.seller_id,
        notification_type="item_sold",
        content=f"Escrow released! ${tx.amount} has been paid out for your listing '{tx.product.title}'."
    )
    db.add(notif)
    db.commit()

    # WS push
    await manager.send_personal_message({
        "event": "notification",
        "data": {
            "type": "item_sold",
            "content": f"Escrow released! ${tx.amount} has been paid out."
        }
    }, tx.seller_id)

    return tx

@router.post("/{transaction_id}/tracking", response_model=schemas.TransactionResponse)
async def update_tracking(
    transaction_id: int,
    tracking_in: schemas.TrackingUpdateRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows the seller to add/update the courier tracking number for an escrow shipment.
    """
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the seller can update the tracking number")

    tx.tracking_number = tracking_in.tracking_number
    db.commit()
    db.refresh(tx)

    # Notify Buyer
    notif = models.Notification(
        user_id=tx.buyer_id,
        notification_type="price_drop",
        content=f"Your order for '{tx.product.title}' has been shipped! Tracking Number: {tx.tracking_number}"
    )
    db.add(notif)
    db.commit()

    # WS push
    await manager.send_personal_message({
        "event": "notification",
        "data": {
            "type": "price_drop",
            "content": f"Shipment tracking updated: {tx.tracking_number}"
        }
    }, tx.buyer_id)

    return tx


@router.post("/{transaction_id}/dispute", response_model=schemas.DisputeResponse)
async def dispute_transaction(
    transaction_id: int,
    dispute_in: schemas.DisputeCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can dispute the transaction")
    
    if tx.status != "escrow":
        raise HTTPException(status_code=400, detail="Only transactions in escrow can be disputed")
    
    existing_dispute = db.query(models.Dispute).filter(models.Dispute.transaction_id == transaction_id).first()
    if existing_dispute:
        raise HTTPException(status_code=400, detail="Dispute already raised for this transaction")

    tx.status = "disputed"
    
    dispute = models.Dispute(
        transaction_id=transaction_id,
        buyer_evidence=dispute_in.evidence,
        buyer_image_url=dispute_in.image_url,
        status="pending"
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    
    notif = models.Notification(
        user_id=tx.seller_id,
        notification_type="new_message",
        content=f"Escrow dispute raised! Buyer has disputed the transaction for '{tx.product.title}'. Please submit counter-evidence."
    )
    db.add(notif)
    db.commit()
    
    await manager.send_personal_message({
        "event": "notification",
        "data": {
            "type": "new_message",
            "content": f"Escrow dispute raised for '{tx.product.title}'."
        }
    }, tx.seller_id)
    
    return dispute


@router.post("/{transaction_id}/dispute/respond", response_model=schemas.DisputeResponse)
async def respond_dispute(
    transaction_id: int,
    respond_in: schemas.DisputeRespond,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the seller can respond to the dispute")
    
    dispute = db.query(models.Dispute).filter(models.Dispute.transaction_id == transaction_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found for this transaction")
        
    if dispute.status != "pending":
        raise HTTPException(status_code=400, detail="Dispute is already resolved")

    dispute.seller_evidence = respond_in.evidence
    dispute.seller_image_url = respond_in.image_url
    
    db.commit()
    db.refresh(dispute)
    
    notif = models.Notification(
        user_id=tx.buyer_id,
        notification_type="new_message",
        content=f"Seller has submitted counter-evidence for the dispute on '{tx.product.title}'."
    )
    db.add(notif)
    db.commit()
    
    await manager.send_personal_message({
        "event": "notification",
        "data": {
            "type": "new_message",
            "content": f"Seller submitted counter-evidence for '{tx.product.title}'."
        }
    }, tx.buyer_id)
    
    return dispute


@router.get("/{transaction_id}/dispute", response_model=schemas.DisputeResponse)
def get_dispute(
    transaction_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.buyer_id != current_user.id and tx.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view dispute details")
        
    dispute = db.query(models.Dispute).filter(models.Dispute.transaction_id == transaction_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found for this transaction")
        
    return dispute
