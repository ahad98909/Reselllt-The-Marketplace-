from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# --- AUTH SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=6)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gender: Optional[str] = None


# --- USER SCHEMAS ---
class UserBase(BaseModel):
    name: str
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    profile_picture: Optional[str] = None
    rating: float
    is_admin: bool
    is_banned: bool
    email_verified: bool
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gender: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None


# --- CATEGORY SCHEMAS ---
class CategoryBase(BaseModel):
    name: str
    slug: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# --- PRODUCT IMAGE SCHEMAS ---
class ProductImageBase(BaseModel):
    image_url: str

class ProductImageResponse(ProductImageBase):
    id: int
    product_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    title: str
    description: str
    category_id: int
    item_condition: str  # 'New', 'Like New', 'Good', 'Fair'
    price: Decimal
    secret_min_price: Optional[Decimal] = None
    location: str
    is_sold: bool = False
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProductCreate(BaseModel):
    title: str
    description: str
    category_id: int
    item_condition: str
    price: Decimal
    secret_min_price: Optional[Decimal] = None
    location: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: List[str] = [] # List of base64 strings or URLs for Cloudinary

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    item_condition: Optional[str] = None
    price: Optional[Decimal] = None
    secret_min_price: Optional[Decimal] = None
    location: Optional[str] = None
    is_sold: Optional[bool] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProductResponse(ProductBase):
    id: int
    seller_id: int
    view_count: int
    created_at: datetime
    images: List[ProductImageResponse] = []
    distance: Optional[float] = None

    class Config:
        from_attributes = True

class ProductDetailResponse(ProductResponse):
    seller: UserResponse
    category: CategoryResponse

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int


# --- FAVORITE SCHEMAS ---
class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    product: ProductResponse

    class Config:
        from_attributes = True


# --- CHAT & MESSAGE SCHEMAS ---
class MessageCreate(BaseModel):
    content: str
    message_type: str = "text" # 'text', 'image'

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    message_type: str
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChatCreate(BaseModel):
    product_id: int

class ChatResponse(BaseModel):
    id: int
    buyer_id: int
    seller_id: int
    product_id: int
    created_at: datetime
    product: ProductResponse
    buyer: UserResponse
    seller: UserResponse
    has_unread: bool = False
    last_message_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatDetailResponse(ChatResponse):
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


# --- REPORT SCHEMAS ---
class ReportCreate(BaseModel):
    product_id: int
    reason: str
    details: Optional[str] = None

class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    product_id: int
    reason: str
    details: Optional[str] = None
    status: str
    created_at: datetime
    product: ProductResponse
    reporter: UserResponse

    class Config:
        from_attributes = True


# --- REVIEW SCHEMAS ---
class ReviewCreate(BaseModel):
    reviewee_id: Optional[int] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    reviewer: UserResponse

    class Config:
        from_attributes = True


# --- NOTIFICATION SCHEMAS ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: str
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- TRANSACTION SCHEMAS ---
class TransactionCreate(BaseModel):
    product_id: int
    shipping_address: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    buyer_id: int
    seller_id: int
    product_id: int
    amount: Decimal
    status: str
    stripe_payment_intent_id: Optional[str] = None
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    product: ProductResponse

    class Config:
        from_attributes = True


# --- AI ASSISTANT SCHEMAS ---
class AIDescriptionSuggestRequest(BaseModel):
    title: str
    category_id: int
    item_condition: str

class AIPriceSuggestRequest(BaseModel):
    title: str
    category_id: int
    item_condition: str

class AISuggestResponse(BaseModel):
    suggestion: str
    confidence: Optional[float] = 1.0
    suggested_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    rationale: Optional[str] = None

class AIVerifyImageRequest(BaseModel):
    image_base64: str
    title: str
    category_name: str

class AIVerifyImageResponse(BaseModel):
    status: str  # 'VERIFIED' or 'FLAGGED'
    is_stock_photo: bool
    confidence: float
    feedback: str
    suggested_condition: Optional[str] = None

class ChatOfferRequest(BaseModel):
    amount: Decimal

class TrackingUpdateRequest(BaseModel):
    tracking_number: str

# --- AI COPILOT SCHEMAS ---
class AICopilotTranslateRequest(BaseModel):
    content: str
    target_lang: str  # 'en', 'ur_roman', 'ur_nastaliq'

class AICopilotTranslateResponse(BaseModel):
    translated_text: str

class AICopilotNegotiateRequest(BaseModel):
    chat_id: int

class AICopilotNegotiateResponse(BaseModel):
    suggestion: str

class DealSlipResponse(BaseModel):
    product_title: str
    listing_price: float
    final_price: float
    buyer_name: str
    seller_name: str
    location: str
    handoff_method: str


# --- DISPUTE SCHEMAS ---
class DisputeCreate(BaseModel):
    evidence: str
    image_url: Optional[str] = None

class DisputeRespond(BaseModel):
    evidence: str
    image_url: Optional[str] = None

class DisputeResponse(BaseModel):
    id: int
    transaction_id: int
    buyer_evidence: str
    buyer_image_url: Optional[str] = None
    seller_evidence: Optional[str] = None
    seller_image_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

