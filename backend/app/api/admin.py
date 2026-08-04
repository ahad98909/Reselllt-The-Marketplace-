from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

@router.get("/dashboard")
def get_admin_dashboard(
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get dashboard metrics and analytics
    """
    total_users = db.query(models.User).count()
    total_products = db.query(models.Product).count()
    active_listings = db.query(models.Product).filter(models.Product.is_sold == False).count()
    total_reports = db.query(models.Report).filter(models.Report.status == "pending").count()
    
    # Calculate transaction volume and escrow sums
    total_volume_query = db.query(func.sum(models.Transaction.amount)).scalar()
    total_volume = float(total_volume_query) if total_volume_query else 0.0

    escrow_held_query = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.status == "escrow"
    ).scalar()
    escrow_held = float(escrow_held_query) if escrow_held_query else 0.0

    # Get recent reports
    recent_reports = db.query(models.Report).order_by(models.Report.created_at.desc()).limit(5).all()
    # Format reports for output
    reports_data = []
    for r in recent_reports:
        reports_data.append({
            "id": r.id,
            "product_title": r.product.title,
            "reporter_name": r.reporter.name,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at
        })

    # Category counts
    category_counts = db.query(
        models.Category.name, 
        func.count(models.Product.id)
    ).join(models.Product, isouter=True).group_by(models.Category.name).all()
    
    cat_distribution = {name: count for name, count in category_counts}

    return {
        "metrics": {
            "total_users": total_users,
            "total_listings": total_products,
            "active_listings": active_listings,
            "pending_reports": total_reports,
            "total_transaction_volume": total_volume,
            "funds_in_escrow": escrow_held
        },
        "recent_reports": reports_data,
        "category_distribution": cat_distribution
    }

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all users in the system
    """
    return db.query(models.User).all()

@router.post("/users/{user_id}/ban")
def toggle_ban_user(
    user_id: int,
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Bans or unbans a user account
    """
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = not user.is_banned
    db.commit()
    db.refresh(user)

    action = "banned" if user.is_banned else "unbanned"
    return {"message": f"User {user.email} successfully {action}."}

@router.get("/reports", response_model=List[schemas.ReportResponse])
def get_reports(
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all submitted reports
    """
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()

@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    status_update: str = Query(..., regex="^(resolved|dismissed)$"),
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update report status (resolve or dismiss)
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = status_update
    db.commit()
    return {"message": f"Report marked as {status_update}."}

@router.delete("/products/{product_id}")
def admin_delete_product(
    product_id: int,
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only removal of listing
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": "Listing removed by administrator."}

@router.post("/categories", response_model=schemas.CategoryResponse)
def create_category(
    category_in: schemas.CategoryCreate,
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Add a new product category
    """
    existing = db.query(models.Category).filter(
        (models.Category.name == category_in.name) | 
        (models.Category.slug == category_in.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name or slug already exists")

    cat = models.Category(name=category_in.name, slug=category_in.slug)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.put("/categories/{category_id}", response_model=schemas.CategoryResponse)
def update_category(
    category_id: int,
    category_in: schemas.CategoryCreate,
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update a product category
    """
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    cat.name = category_in.name
    cat.slug = category_in.slug
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Remove a category. Note: Will block if products are assigned (due to RESTRICT constraint).
    """
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    try:
        db.delete(cat)
        db.commit()
    except Exception:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete category because it has active products assigned. Reassign products first."
        )
    return {"message": "Category deleted successfully."}


@router.get("/disputes", response_model=List[schemas.DisputeResponse])
def get_disputes(
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all disputes (active and resolved)
    """
    return db.query(models.Dispute).order_by(models.Dispute.created_at.desc()).all()


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: int,
    decision: str = Query(..., pattern="^(buyer|seller)$"),
    current_admin: models.User = Depends(deps.get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Resolves the dispute by deciding whether to refund buyer or pay seller.
    """
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    if dispute.status != "pending":
        raise HTTPException(status_code=400, detail="Dispute has already been resolved")
        
    tx = db.query(models.Transaction).filter(models.Transaction.id == dispute.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found for this dispute")
        
    if decision == "buyer":
        dispute.status = "resolved_to_buyer"
        tx.status = "refunded"
        
        notif_buyer = models.Notification(
            user_id=tx.buyer_id,
            notification_type="new_message",
            content=f"Dispute resolved in your favor! ${tx.amount} for '{tx.product.title}' has been refunded."
        )
        notif_seller = models.Notification(
            user_id=tx.seller_id,
            notification_type="new_message",
            content=f"Dispute resolved in favor of buyer. Escrow funds for '{tx.product.title}' have been refunded."
        )
        db.add(notif_buyer)
        db.add(notif_seller)
        db.commit()
        
        from app.services.websocket import manager
        await manager.send_personal_message({
            "event": "notification",
            "data": {
                "type": "new_message",
                "content": f"Dispute resolved: refunded to buyer."
            }
        }, tx.buyer_id)
    else:
        dispute.status = "resolved_to_seller"
        tx.status = "released"
        
        notif_buyer = models.Notification(
            user_id=tx.buyer_id,
            notification_type="new_message",
            content=f"Dispute resolved in favor of seller. Escrow funds for '{tx.product.title}' have been released."
        )
        notif_seller = models.Notification(
            user_id=tx.seller_id,
            notification_type="new_message",
            content=f"Dispute resolved in your favor! ${tx.amount} for '{tx.product.title}' has been paid out."
        )
        db.add(notif_buyer)
        db.add(notif_seller)
        db.commit()
        
        from app.services.websocket import manager
        await manager.send_personal_message({
            "event": "notification",
            "data": {
                "type": "new_message",
                "content": f"Dispute resolved: released to seller."
            }
        }, tx.seller_id)
        
    db.commit()
    return {"message": f"Dispute resolved successfully in favor of {decision}."}
