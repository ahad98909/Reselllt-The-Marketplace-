import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Second-Hand Marketplace"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeychangeinproduction12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # MySQL Database Config
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "db")
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "rootpassword")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "marketplace")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")

    @field_validator("MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DB", "MYSQL_PORT", mode="before")
    @classmethod
    def strip_db_config(cls, v):
        if isinstance(v, str):
            return v.strip().replace("\r", "").replace("\n", "")
        return v

    @property
    def DATABASE_URL(self) -> str:
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+pymysql://{self.MYSQL_USER}:{encoded_password}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    # Cloudinary Config
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

    # Stripe Config
    STRIPE_API_KEY: str = os.getenv("STRIPE_API_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # AI Config
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Local Storage Settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # Frontend URL for redirections
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    class Config:
        case_sensitive = True

settings = Settings()
