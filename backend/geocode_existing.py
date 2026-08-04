import time
from app.core.database import SessionLocal
from app.models import models
from app.core.geocoding import geocode_address

def geocode_database():
    db = SessionLocal()
    try:
        print("Geocoding users with missing coordinates...")
        users = db.query(models.User).filter(
            (models.User.latitude.is_(None)) | (models.User.longitude.is_(None))
        ).all()
        
        for u in users:
            if u.address:
                print(f"Geocoding address for User ID {u.id}: '{u.address}'...")
                lat, lon = geocode_address(u.address)
                if lat is not None and lon is not None:
                    u.latitude = lat
                    u.longitude = lon
                    print(f"-> Success! Lat: {lat}, Lon: {lon}")
                    db.commit()
                else:
                    # Fallback mapping if Nominatim fails or returns nothing (e.g. for simple city names)
                    clean_addr = u.address.split(',')[0].strip().lower()
                    if "karachi" in clean_addr:
                        u.latitude = 24.8607
                        u.longitude = 67.0011
                        db.commit()
                        print(f"-> Fallback used for Karachi! Lat: {u.latitude}, Lon: {u.longitude}")
                    elif "lahore" in clean_addr:
                        u.latitude = 31.5204
                        u.longitude = 74.3587
                        db.commit()
                        print(f"-> Fallback used for Lahore! Lat: {u.latitude}, Lon: {u.longitude}")
                    elif "islamabad" in clean_addr:
                        u.latitude = 33.6844
                        u.longitude = 73.0479
                        db.commit()
                        print(f"-> Fallback used for Islamabad! Lat: {u.latitude}, Lon: {u.longitude}")
                    elif "rawalpindi" in clean_addr:
                        u.latitude = 33.5984
                        u.longitude = 73.0441
                        db.commit()
                        print(f"-> Fallback used for Rawalpindi! Lat: {u.latitude}, Lon: {u.longitude}")
                    else:
                        print("-> Failed to geocode and no fallback matches.")
                time.sleep(1) # Conform to Nominatim's usage policy (max 1 request/sec)

        print("\nGeocoding products with missing coordinates...")
        products = db.query(models.Product).filter(
            (models.Product.latitude.is_(None)) | (models.Product.longitude.is_(None))
        ).all()

        for p in products:
            if p.location:
                print(f"Geocoding location for Product ID {p.id} ({p.title}): '{p.location}'...")
                lat, lon = geocode_address(p.location)
                if lat is not None and lon is not None:
                    p.latitude = lat
                    p.longitude = lon
                    print(f"-> Success! Lat: {lat}, Lon: {lon}")
                    db.commit()
                else:
                    # Fallback mapping if Nominatim fails or returns nothing (e.g. for simple city names)
                    clean_loc = p.location.split(',')[0].strip().lower()
                    if "karachi" in clean_loc:
                        p.latitude = 24.8607
                        p.longitude = 67.0011
                        db.commit()
                        print(f"-> Fallback used for Karachi! Lat: {p.latitude}, Lon: {p.longitude}")
                    elif "lahore" in clean_loc:
                        p.latitude = 31.5204
                        p.longitude = 74.3587
                        db.commit()
                        print(f"-> Fallback used for Lahore! Lat: {p.latitude}, Lon: {p.longitude}")
                    elif "islamabad" in clean_loc:
                        p.latitude = 33.6844
                        p.longitude = 73.0479
                        db.commit()
                        print(f"-> Fallback used for Islamabad! Lat: {p.latitude}, Lon: {p.longitude}")
                    elif "rawalpindi" in clean_loc:
                        p.latitude = 33.5984
                        p.longitude = 73.0441
                        db.commit()
                        print(f"-> Fallback used for Rawalpindi! Lat: {p.latitude}, Lon: {p.longitude}")
                    else:
                        print("-> Failed to geocode and no fallback matches.")
                time.sleep(1) # Conform to Nominatim's usage policy (max 1 request/sec)
                
        print("\nAll geocoding updates completed successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    geocode_database()
