from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Automatically enable SSL for remote cloud databases (Aiven, Railway, etc.)
connect_args = {}
if settings.MYSQL_HOST not in ["db", "localhost", "127.0.0.1"]:
    connect_args = {"ssl": {}}

# For MySQL, we configure standard connection pool parameters
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
