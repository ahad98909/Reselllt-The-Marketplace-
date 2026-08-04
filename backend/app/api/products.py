from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from typing import List, Optional
from decimal import Decimal
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.services import image_storage
from app.core.geocoding import geocode_address
from app.services.ai_service import semantic_search_products, visual_search_products
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["Products"])

class VisualSearchRequest(BaseModel):
    image: str

@router.get("/search/semantic", response_model=List[schemas.ProductResponse])
async def search_semantic(
    q: str = Query("", description="Natural language search query"),
    db: Session = Depends(get_db)
):
    """
    Search listings semantically using Gemini 1.5 Flash
    """
    products = db.query(models.Product).filter(models.Product.is_sold == False).all()
    plist = [{"id": p.id, "title": p.title, "description": p.description, "price": p.price} for p in products]
    matched_ids = await semantic_search_products(q, plist)
    if not matched_ids:
        return []
    
    matched_products = db.query(models.Product).filter(models.Product.id.in_(matched_ids)).all()
    prod_map = {p.id: p for p in matched_products}
    ordered_products = [prod_map[pid] for pid in matched_ids if pid in prod_map]
    return ordered_products

@router.post("/search/visual", response_model=List[schemas.ProductResponse])
async def search_visual(
    req: VisualSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Search listings visually using a photo upload via Gemini Multimodal Analysis
    """
    base64_data = req.image
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]
        
    products = db.query(models.Product).filter(models.Product.is_sold == False).all()
    plist = [{"id": p.id, "title": p.title, "description": p.description, "price": p.price} for p in products]
    matched_ids = await visual_search_products(base64_data, plist)
    if not matched_ids:
        return []
        
    matched_products = db.query(models.Product).filter(models.Product.id.in_(matched_ids)).all()
    prod_map = {p.id: p for p in matched_products}
    ordered_products = [prod_map[pid] for pid in matched_ids if pid in prod_map]
    return ordered_products

@router.get("", response_model=schemas.ProductListResponse)
def get_products(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    min_price: Optional[Decimal] = Query(None),
    max_price: Optional[Decimal] = Query(None),
    location: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest"), # newest, price_asc, price_desc, closest
    user_lat: Optional[float] = Query(None),
    user_lon: Optional[float] = Query(None),
):
    query = db.query(models.Product).filter(models.Product.is_sold == False)

    # Filtering
    if search:
        query = query.filter(
            or_(
                models.Product.title.like(f"%{search}%"),
                models.Product.description.like(f"%{search}%")
            )
        )
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)
    if location:
        query = query.filter(models.Product.location.like(f"%{location}%"))

    is_closest = (sort_by == "closest" and user_lat is not None and user_lon is not None)
    distance_expression = None

    if is_closest:
        # Require products to have coordinates
        query = query.filter(
            models.Product.latitude.isnot(None),
            models.Product.longitude.isnot(None)
        )
        # Haversine distance formula in kilometers
        rad_lat = func.radians(models.Product.latitude)
        rad_lng = func.radians(models.Product.longitude)
        rad_user_lat = func.radians(user_lat)
        rad_user_lng = func.radians(user_lon)
        
        cos_val = (
            func.cos(rad_user_lat) * func.cos(rad_lat) * 
            func.cos(rad_lng - rad_user_lng) + 
            func.sin(rad_user_lat) * func.sin(rad_lat)
        )
        capped_cos = func.greatest(-1.0, func.least(1.0, cos_val))
        distance_expression = 6371 * func.acos(capped_cos)
        
        # Filter by distance (100 km radius)
        query = query.filter(distance_expression <= 100)

    # Total Count (reflecting applied filters including distance)
    total = query.count()

    # Sorting & Pagination
    if is_closest:
        query_with_distance = query.with_entities(models.Product, distance_expression.label("distance")).order_by(asc("distance"))
        offset = (page - 1) * size
        items_tuples = query_with_distance.offset(offset).limit(size).all()
        items = []
        for p, d in items_tuples:
            p.distance = d
            items.append(p)
    else:
        if sort_by == "price_asc":
            query = query.order_by(asc(models.Product.price))
        elif sort_by == "price_desc":
            query = query.order_by(desc(models.Product.price))
        else: # newest
            query = query.order_by(desc(models.Product.created_at))

        offset = (page - 1) * size
        items = query.offset(offset).limit(size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/{product_id}", response_model=schemas.ProductDetailResponse)
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product listing not found")
    
    # Increment view counter
    product.view_count += 1
    db.commit()
    db.refresh(product)
    return product

@router.post("", response_model=schemas.ProductResponse)
def create_product(
    product_in: schemas.ProductCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify category exists
    category = db.query(models.Category).filter(models.Category.id == product_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid Category ID")

    lat = product_in.latitude
    lon = product_in.longitude
    if (lat is None or lon is None) and product_in.location:
        lat, lon = geocode_address(product_in.location)

    # Create Product
    db_product = models.Product(
        title=product_in.title,
        description=product_in.description,
        category_id=product_in.category_id,
        item_condition=product_in.item_condition,
        price=product_in.price,
        secret_min_price=product_in.secret_min_price,
        location=product_in.location,
        seller_id=current_user.id,
        is_sold=False,
        view_count=0,
        contact_email=product_in.contact_email if product_in.contact_email else current_user.email,
        contact_phone=product_in.contact_phone,
        latitude=lat,
        longitude=lon
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Process and save images
    for image_data in product_in.images:
        try:
            url = image_storage.save_base64_image(image_data)
            db_img = models.ProductImage(product_id=db_product.id, image_url=url)
            db.add(db_img)
        except Exception as e:
            # Clean up uploaded elements and raise error
            db.delete(db_product)
            db.commit()
            raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")

    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Only seller or admin can modify
    if product.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to modify this listing")

    update_data = product_in.model_dump(exclude_unset=True)
    if "location" in update_data and ("latitude" not in update_data or "longitude" not in update_data or update_data.get("latitude") is None or update_data.get("longitude") is None):
        lat, lon = geocode_address(update_data["location"])
        if lat is not None and lon is not None:
            update_data["latitude"] = lat
            update_data["longitude"] = lon

    for field, val in update_data.items():
        setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Only seller or admin can delete
    if product.seller_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")

    db.delete(product)
    db.commit()
    return {"message": "Product listing deleted successfully."}

@router.post("/{product_id}/sold", response_model=schemas.ProductResponse)
def mark_product_as_sold(
    product_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this listing status")

    product.is_sold = True
    db.commit()
    db.refresh(product)
    return product
