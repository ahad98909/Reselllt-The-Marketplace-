from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI Copilot"])

@router.post("/description-suggest", response_model=schemas.AISuggestResponse)
async def suggest_description(
    req: schemas.AIDescriptionSuggestRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Suggests a detailed, attractive product description based on product title, condition, and category.
    """
    category = db.query(models.Category).filter(models.Category.id == req.category_id).first()
    category_name = category.name if category else "General"

    suggestion = await ai_service.generate_ai_description(
        title=req.title,
        category_name=category_name,
        condition=req.item_condition
    )

    return {
        "suggestion": suggestion,
        "confidence": 0.95
    }

@router.post("/price-suggest", response_model=schemas.AISuggestResponse)
def suggest_price(
    req: schemas.AIPriceSuggestRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyzes historical category listings to suggest an optimal starting price and listing range.
    """
    res = ai_service.suggest_ai_price(
        db=db,
        title=req.title,
        category_id=req.category_id,
        condition=req.item_condition
    )

    suggestion_text = (
        f"Suggested Price: ${res['suggested_price']:.2f}\n"
        f"Range: ${res['min_price']:.2f} - ${res['max_price']:.2f}\n\n"
        f"{res['rationale']}"
    )

    return {
        "suggestion": suggestion_text,
        "confidence": 0.88,
        "suggested_price": float(res['suggested_price']),
        "min_price": float(res['min_price']),
        "max_price": float(res['max_price']),
        "rationale": res['rationale']
    }

@router.post("/verify-image", response_model=schemas.AIVerifyImageResponse)
async def verify_image(
    req: schemas.AIVerifyImageRequest,
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Validates uploaded listing image using Gemini Vision, analyzing stock-photo characteristics and condition.
    """
    res = await ai_service.verify_ai_image(
        base64_image=req.image_base64,
        title=req.title,
        category_name=req.category_name
    )
    return res

@router.post("/copilot/translate", response_model=schemas.AICopilotTranslateResponse)
async def translate_chat_message(
    req: schemas.AICopilotTranslateRequest,
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Translates chat message content Roman Urdu <-> English <-> Nastaliq Urdu on the fly.
    """
    translated = await ai_service.translate_text(req.content, req.target_lang)
    return {"translated_text": translated}

@router.post("/copilot/negotiate", response_model=schemas.AICopilotNegotiateResponse)
async def suggest_negotiation(
    req: schemas.AICopilotNegotiateRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uses chat context to suggest a professional/polite negotiation response.
    """
    suggestion = await ai_service.generate_negotiation_reply(db, req.chat_id, current_user.id)
    return {"suggestion": suggestion}

@router.get("/copilot/dealslip/{chat_id}", response_model=schemas.DealSlipResponse)
def get_dealslip(
    chat_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the deal slip summary containing negotiated price and handoff terms.
    """
    res = ai_service.generate_dealslip(db, chat_id)
    return res


