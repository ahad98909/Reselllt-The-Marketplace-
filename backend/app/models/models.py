from sqlalchemy import Column, Integer, String, Boolean, Float, DECIMAL, ForeignKey, Text, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_picture = Column(String(255), nullable=True)
    rating = Column(Float, default=0.0)
    is_admin = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationships
    products = relationship("Product", back_populates="seller", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    reviews_written = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer", cascade="all, delete-orphan")
    reviews_received = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "Categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "Products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("Categories.id", ondelete="RESTRICT"), nullable=False)
    item_condition = Column(String(50), nullable=False)  # 'New', 'Like New', 'Good', 'Fair'
    price = Column(DECIMAL(10, 2), nullable=False)
    secret_min_price = Column(DECIMAL(10, 2), nullable=True)
    location = Column(String(150), nullable=False)
    seller_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    is_sold = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationships
    category = relationship("Category", back_populates="products")
    seller = relationship("User", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="product", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="product", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base):
    __tablename__ = "ProductImages"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("Products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    product = relationship("Product", back_populates="images")

class Favorite(Base):
    __tablename__ = "Favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("Products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")

class Chat(Base):
    __tablename__ = "Chats"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    seller_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("Products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    product = relationship("Product", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "Messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("Chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    message_type = Column(String(50), default="text")  # 'text', 'image'
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User")

class Report(Base):
    __tablename__ = "Reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("Products.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # 'pending', 'resolved', 'dismissed'
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    reporter = relationship("User")
    product = relationship("Product", back_populates="reports")

class Review(Base):
    __tablename__ = "Reviews"

    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_written")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")

class Notification(Base):
    __tablename__ = "Notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # 'new_message', 'item_sold', 'offer', 'price_drop'
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    user = relationship("User", back_populates="notifications")

class Transaction(Base):
    __tablename__ = "Transactions"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    seller_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("Products.id", ondelete="CASCADE"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(50), default="escrow")  # 'escrow', 'released', 'refunded'
    stripe_payment_intent_id = Column(String(255), nullable=True)
    shipping_address = Column(String(255), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    product = relationship("Product")


class Dispute(Base):
    __tablename__ = "Disputes"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("Transactions.id", ondelete="CASCADE"), nullable=False)
    buyer_evidence = Column(Text, nullable=False)
    buyer_image_url = Column(String(255), nullable=True)
    seller_evidence = Column(Text, nullable=True)
    seller_image_url = Column(String(255), nullable=True)
    status = Column(String(50), default="pending")  # 'pending', 'resolved_to_buyer', 'resolved_to_seller'
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    transaction = relationship("Transaction")
