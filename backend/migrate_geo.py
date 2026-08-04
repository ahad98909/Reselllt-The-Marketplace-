from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Running database migrations for geolocation fields...")
    queries = [
        "ALTER TABLE Users ADD COLUMN address VARCHAR(255) NULL;",
        "ALTER TABLE Users ADD COLUMN latitude DOUBLE NULL;",
        "ALTER TABLE Users ADD COLUMN longitude DOUBLE NULL;",
        "ALTER TABLE Products ADD COLUMN latitude DOUBLE NULL;",
        "ALTER TABLE Products ADD COLUMN longitude DOUBLE NULL;"
    ]
    with engine.begin() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                print(f"Successfully executed: {q}")
            except Exception as e:
                print(f"Skipped execution of: {q}. Reason: {e}")

if __name__ == "__main__":
    migrate()
