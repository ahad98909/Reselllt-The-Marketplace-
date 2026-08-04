from app.core.database import SessionLocal
from app.models import models

db = SessionLocal()
try:
    print("--- USERS ---")
    users = db.query(models.User).all()
    for u in users:
        print(f"ID: {u.id} | Name: {u.name} | Email: {u.email} | Rating: {u.rating}")

    print("\n--- PRODUCTS ---")
    products = db.query(models.Product).limit(5).all()
    for p in products:
        print(f"ID: {p.id} | Title: {p.title} | Price: {p.price} | Seller ID: {p.seller_id}")

    print("\n--- CHATS ---")
    chats = db.query(models.Chat).all()
    for c in chats:
        print(f"ID: {c.id} | Buyer ID: {c.buyer_id} | Seller ID: {c.seller_id} | Product ID: {c.product_id}")

    print("\n--- MESSAGES ---")
    msgs = db.query(models.Message).all()
    for m in msgs:
        print(f"ID: {m.id} | Chat ID: {m.chat_id} | Sender ID: {m.sender_id} | Content: {m.content}")

finally:
    db.close()
