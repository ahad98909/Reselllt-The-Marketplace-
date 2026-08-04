import os
import uuid
import base64
import re
from fastapi import UploadFile
from app.core.config import settings

# Try importing cloudinary, but handle if it isn't configured
try:
    import cloudinary
    import cloudinary.uploader
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        CLOUDINARY_AVAILABLE = True
    else:
        CLOUDINARY_AVAILABLE = False
except ImportError:
    CLOUDINARY_AVAILABLE = False

def save_base64_image(base64_data: str) -> str:
    """
    Saves a base64 encoded image either to Cloudinary (if active) or locally.
    Returns the URL/path to the saved image.
    """
    # Check if this is already an HTTP URL (e.g. Unsplash placeholders or previously uploaded)
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    # Parse base64 string
    # Expected format: data:image/png;base64,iVBORw0KGgoAAA...
    pattern = re.compile(r'^data:image/(jpeg|png|jpg|webp);base64,')
    match = pattern.match(base64_data)
    
    if not match:
        raise ValueError("Invalid image format. Must be a valid image base64 data URL.")
        
    ext = match.group(1)
    base64_str = pattern.sub('', base64_data)
    image_bytes = base64.b64decode(base64_str)

    if CLOUDINARY_AVAILABLE:
        try:
            # Upload to Cloudinary using raw bytes
            upload_result = cloudinary.uploader.upload(
                image_bytes,
                folder="marketplace_listings"
            )
            return upload_result.get("secure_url")
        except Exception as e:
            # Fallback to local storage on error
            print(f"Cloudinary upload failed: {e}. Falling back to local storage.")
            pass

    # Local storage fallback
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
        
    # Return reverse-proxied relative path (served by Nginx or FastAPI static files)
    return f"/uploads/{filename}"

def save_upload_file(upload_file: UploadFile) -> str:
    """
    Saves a FastAPI UploadFile object.
    """
    if CLOUDINARY_AVAILABLE:
        try:
            upload_result = cloudinary.uploader.upload(
                upload_file.file,
                folder="marketplace_listings"
            )
            return upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}. Falling back to local storage.")
            pass

    # Local fallback
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = upload_file.filename.split(".")[-1] if "." in upload_file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    upload_file.file.seek(0)
    with open(filepath, "wb") as f:
        f.write(upload_file.file.read())

    return f"/uploads/{filename}"
