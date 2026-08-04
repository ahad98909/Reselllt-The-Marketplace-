from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=schemas.ReportResponse)
def report_product(
    report_in: schemas.ReportCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a report flagging an item as inappropriate, spam, or a scam
    """
    # Verify product exists
    product = db.query(models.Product).filter(models.Product.id == report_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot report your own product listing")

    report = models.Report(
        reporter_id=current_user.id,
        product_id=report_in.product_id,
        reason=report_in.reason,
        details=report_in.details,
        status="pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
