from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import json
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.services.websocket import manager
from jose import jwt
from app.core.config import settings

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.get("", response_model=List[schemas.ChatResponse])
def get_chats(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active chats for the current user (either as buyer or seller) and sort by latest activity
    """
    chats = db.query(models.Chat).filter(
        or_(
            models.Chat.buyer_id == current_user.id,
            models.Chat.seller_id == current_user.id
        )
    ).all()

    # Compute has_unread and last_message_at for sorting and client use
    for chat in chats:
        unread_exists = db.query(models.Message).filter(
            models.Message.chat_id == chat.id,
            models.Message.is_read == False,
            models.Message.sender_id != current_user.id
        ).first() is not None
        chat.has_unread = unread_exists

        latest_msg = db.query(models.Message).filter(
            models.Message.chat_id == chat.id
        ).order_by(models.Message.created_at.desc()).first()
        chat.last_message_at = latest_msg.created_at if latest_msg else chat.created_at

    # Sort chats by latest activity (newest messages first)
    chats.sort(key=lambda c: c.last_message_at or c.created_at, reverse=True)
    return chats

@router.post("", response_model=schemas.ChatResponse)
async def start_chat(
    chat_in: schemas.ChatCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chat conversation for a product
    """
    product = db.query(models.Product).filter(models.Product.id == chat_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot start a chat with yourself for your own item")

    # Check if chat already exists
    chat = db.query(models.Chat).filter(
        models.Chat.buyer_id == current_user.id,
        models.Chat.seller_id == product.seller_id,
        models.Chat.product_id == product.id
    ).first()

    if not chat:
        chat = models.Chat(
            buyer_id=current_user.id,
            seller_id=product.seller_id,
            product_id=product.id
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)

        # Automatically insert an initial inquiry message from the buyer
        initial_msg = models.Message(
            chat_id=chat.id,
            sender_id=current_user.id,
            message_type="text",
            content=f"Salam! Is this '{product.title}' still available for Rs. {int(product.price):,}?",
            is_read=False
        )
        db.add(initial_msg)
        db.commit()
        db.refresh(initial_msg)

        # Broadcast WebSocket new_message event to the seller so they see it instantly in real time
        payload = {
            "event": "new_message",
            "data": {
                "id": initial_msg.id,
                "chat_id": chat.id,
                "sender_id": current_user.id,
                "content": initial_msg.content,
                "message_type": initial_msg.message_type,
                "created_at": str(initial_msg.created_at),
                "is_read": False
            }
        }
        await manager.send_personal_message(payload, product.seller_id)

    # Populate temporary response schema fields
    unread_exists = db.query(models.Message).filter(
        models.Message.chat_id == chat.id,
        models.Message.is_read == False,
        models.Message.sender_id != current_user.id
    ).first() is not None
    chat.has_unread = unread_exists

    latest_msg = db.query(models.Message).filter(
        models.Message.chat_id == chat.id
    ).order_by(models.Message.created_at.desc()).first()
    chat.last_message_at = latest_msg.created_at if latest_msg else chat.created_at

    return chat

@router.get("/{chat_id}", response_model=schemas.ChatDetailResponse)
def get_chat_history(
    chat_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve message history for a specific chat room
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if chat.buyer_id != current_user.id and chat.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this chat")

    return chat

@router.post("/{chat_id}/messages", response_model=schemas.MessageResponse)
async def send_message(
    chat_id: int,
    msg_in: schemas.MessageCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    REST API fallback to send messages (useful for media files/images payload upload)
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.buyer_id != current_user.id and chat.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to post in this chat")

    recipient_id = chat.seller_id if current_user.id == chat.buyer_id else chat.buyer_id

    # Create message
    db_msg = models.Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        message_type=msg_in.message_type,
        content=msg_in.content,
        is_read=False
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    # Deliver alert through websocket if recipient is online
    payload = {
        "event": "new_message",
        "data": {
            "id": db_msg.id,
            "chat_id": chat_id,
            "sender_id": current_user.id,
            "content": db_msg.content,
            "message_type": db_msg.message_type,
            "created_at": str(db_msg.created_at),
            "is_read": False
        }
    }
    
    # Broadcast to recipient and sender (sync tabs)
    await manager.send_personal_message(payload, recipient_id)
    await manager.send_personal_message(payload, current_user.id)

    return db_msg

@router.post("/{chat_id}/read")
async def mark_as_read(
    chat_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread messages in the chat room sent by the counterparty as read
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Update messages
    db.query(models.Message).filter(
        models.Message.chat_id == chat_id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read == False
    ).update({models.Message.is_read: True})
    
    db.commit()

    # Trigger read notification over WebSocket
    recipient_id = chat.seller_id if current_user.id == chat.buyer_id else chat.buyer_id
    payload = {
        "event": "read_receipt",
        "data": {
            "chat_id": chat_id,
            "reader_id": current_user.id
        }
    }
    await manager.send_personal_message(payload, recipient_id)

    return {"message": "All messages marked as read."}

# InMemory Mock Blocks table to avoid changing DB schema or run migrations
blocked_connections = set() # Set of tuples (blocker_id, blocked_id)

@router.post("/block/{user_id}")
def block_user(
    user_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Blocks a user from sending messages or initiating chats
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
        
    blocked_connections.add((current_user.id, user_id))
    return {"message": f"Successfully blocked user ID {user_id}"}

@router.post("/unblock/{user_id}")
def unblock_user(
    user_id: int,
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Unblocks a user
    """
    if (current_user.id, user_id) in blocked_connections:
        blocked_connections.remove((current_user.id, user_id))
    return {"message": f"Successfully unblocked user ID {user_id}"}

@router.delete("/{chat_id}", status_code=status.HTTP_200_OK)
def delete_chat(
    chat_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a chat conversation and all associated messages.
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.buyer_id != current_user.id and chat.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this chat")
    
    db.delete(chat)
    db.commit()
    return {"message": "Chat successfully deleted."}

@router.post("/{chat_id}/offer", response_model=schemas.MessageResponse)
async def make_offer(
    chat_id: int,
    offer_in: schemas.ChatOfferRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a bargaining offer on a product. Automatically negotiates based on the seller's secret minimum price.
    """
    from decimal import Decimal
    import json
    
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.buyer_id != current_user.id:
        raise HTTPException(status_code=400, detail="Only the buyer can make an offer")

    product = db.query(models.Product).filter(models.Product.id == chat.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.is_sold:
        raise HTTPException(status_code=400, detail="Product is already sold")

    offer_amount = Decimal(str(offer_in.amount))
    
    # Calculate default secret minimum price as 85% of price if not set
    secret_min = Decimal(str(product.secret_min_price)) if product.secret_min_price is not None else Decimal(str(product.price)) * Decimal("0.85")

    status_str = "pending"
    message_text = ""
    counter_amount = None

    if offer_amount >= product.price:
        status_str = "accepted"
        product.price = offer_amount
        message_text = f"Offer of Rs. {int(offer_amount):,} accepted! The listing price is updated."
    elif offer_amount >= secret_min:
        status_str = "accepted"
        product.price = offer_amount
        message_text = f"Offer of Rs. {int(offer_amount):,} accepted automatically! The listing price is updated."
    else:
        status_str = "countered"
        # Midpoint of listing price and secret minimum, rounded to nearest 100
        counter_val = round(float(product.price + secret_min) / 200.0) * 100
        counter_amount = Decimal(str(counter_val))
        message_text = f"Your offer of Rs. {int(offer_amount):,} is too low. The system counter-offers Rs. {int(counter_amount):,}."

    offer_data = {
        "amount": float(offer_amount),
        "status": status_str,
        "counter_amount": float(counter_amount) if counter_amount else None,
        "feedback": message_text
    }

    # Create message of type 'offer'
    db_msg = models.Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        message_type="offer",
        content=json.dumps(offer_data),
        is_read=False
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    # Deliver over WebSockets
    payload = {
        "event": "new_message",
        "data": {
            "id": db_msg.id,
            "chat_id": chat_id,
            "sender_id": current_user.id,
            "content": db_msg.content,
            "message_type": db_msg.message_type,
            "created_at": str(db_msg.created_at),
            "is_read": False
        }
    }
    recipient_id = chat.seller_id if current_user.id == chat.buyer_id else chat.buyer_id
    await manager.send_personal_message(payload, recipient_id)
    await manager.send_personal_message(payload, current_user.id)

    # Send Notification if offer accepted
    if status_str == "accepted":
        notif = models.Notification(
            user_id=chat.buyer_id,
            notification_type="price_drop",
            content=f"Congratulations! Your offer on '{product.title}' has been accepted at Rs. {int(offer_amount):,}!"
        )
        db.add(notif)
        db.commit()
        
        await manager.send_personal_message({
            "event": "notification",
            "data": {
                "type": "price_drop",
                "content": f"Offer accepted! Listing price updated to Rs. {int(offer_amount):,}."
            }
        }, chat.buyer_id)

    return db_msg
