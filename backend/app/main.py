import sys
import os
# Add parent directory of 'app' to sys.path for serverless deployment pathing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import json
from typing import Optional

from app.core.config import settings
from app.core.database import get_db, engine, Base
from app.api import auth, users, products, favorites, chats, notifications, reports, transactions, admin, ai, geocoding
from app.services.websocket import manager
from jose import jwt, JWTError
from app.models import models

# Ensure tables are built (fallback if running without Docker init.sql)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database sync warning: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack second-hand marketplace API backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "host": settings.MYSQL_HOST[:5] + "..." if len(settings.MYSQL_HOST) > 5 else settings.MYSQL_HOST
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e),
            "host": settings.MYSQL_HOST[:5] + "..." if len(settings.MYSQL_HOST) > 5 else settings.MYSQL_HOST
        }

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files directory for local image access
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Router endpoints
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(chats.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(geocoding.router, prefix="/api")

@app.get("/")
def redirect_to_login():
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "project": settings.PROJECT_NAME}

# WebSocket entrypoint
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    WebSocket connection endpoint. Authenticates client using token query parameter,
    then enters communication event loop.
    """
    if not token:
        await websocket.close(code=4003, reason="Token query parameter missing")
        return

    # Verify and parse JWT token to extract User ID
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=4003, reason="Token invalid: no sub claim")
            return
        user_id = int(user_id_str)
    except (JWTError, ValueError) as e:
        await websocket.close(code=4003, reason=f"Token invalid: {str(e)}")
        return

    # Database session for websocket handlers
    db: Session = next(get_db())

    # Verify user isn't banned
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or user.is_banned:
        await websocket.close(code=4003, reason="Account is banned or user not found")
        db.close()
        return

    # Add connection
    await manager.connect(user_id, websocket)
    print(f"User ID {user_id} connected over WebSocket.")

    try:
        while True:
            # Await client payload
            data = await websocket.receive_text()
            payload = json.loads(data)
            event = payload.get("event")
            event_data = payload.get("data", {})
            print(f"DEBUG WS: user_id={user_id} event={event} data={event_data}")

            if event == "send_message":
                chat_id = int(event_data.get("chat_id"))
                content = event_data.get("content")
                message_type = event_data.get("message_type", "text")

                # Fetch chat details
                chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
                if not chat:
                    continue

                if chat.buyer_id != user_id and chat.seller_id != user_id:
                    continue

                recipient_id = chat.seller_id if user_id == chat.buyer_id else chat.buyer_id

                # Check if blocker relation exists
                from app.api.chats import blocked_connections
                if (recipient_id, user_id) in blocked_connections:
                    # Recipient has blocked the sender. Silently ignore delivery.
                    # Send a confirmation to sender only so their screen doesn't hang.
                    payload_blocked = {
                        "event": "new_message",
                        "data": {
                            "id": -1,
                            "chat_id": chat_id,
                            "sender_id": user_id,
                            "content": f"[Blocked Message] {content}",
                            "message_type": message_type,
                            "created_at": "Just now",
                            "is_read": False
                        }
                    }
                    await manager.send_personal_message(payload_blocked, user_id)
                    continue

                # Save message
                msg = models.Message(
                    chat_id=chat_id,
                    sender_id=user_id,
                    message_type=message_type,
                    content=content,
                    is_read=False
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                # Formulate broadcast
                broadcast_payload = {
                    "event": "new_message",
                    "data": {
                        "id": msg.id,
                        "chat_id": chat_id,
                        "sender_id": user_id,
                        "content": msg.content,
                        "message_type": msg.message_type,
                        "created_at": str(msg.created_at),
                        "is_read": False
                    }
                }

                # Push to both recipient and other active tabs of sender
                await manager.send_personal_message(broadcast_payload, recipient_id)
                await manager.send_personal_message(broadcast_payload, user_id)

                # Create push notification for recipient
                notif = models.Notification(
                    user_id=recipient_id,
                    notification_type="new_message",
                    content=f"You received a new message from {user.name} regarding your listing."
                )
                db.add(notif)
                db.commit()

                # WS notify alert
                await manager.send_personal_message({
                    "event": "notification",
                    "data": {
                        "type": "new_message",
                        "content": f"New message from {user.name}."
                    }
                }, recipient_id)

            elif event == "typing":
                chat_id = int(event_data.get("chat_id"))
                is_typing = bool(event_data.get("is_typing"))

                chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
                if chat:
                    recipient_id = chat.seller_id if user_id == chat.buyer_id else chat.buyer_id
                    await manager.send_personal_message({
                        "event": "typing",
                        "data": {
                            "chat_id": chat_id,
                            "sender_id": user_id,
                            "is_typing": is_typing
                        }
                    }, recipient_id)

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        print(f"User ID {user_id} disconnected from WebSocket.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(user_id, websocket)
    finally:
        db.close()
