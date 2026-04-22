from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "supersecretkey"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@db:5432/pitchvault"
    REDIS_URL: str = "redis://redis:6379/0"

    S3_BUCKET: str = "pitchvault-content"
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = "minioadmin"
    AWS_SECRET_ACCESS_KEY: str = "minioadmin"
    S3_ENDPOINT_URL: Optional[str] = "http://minio:9000"
    
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@pitchvault.io"
    
    ENTRA_CLIENT_ID: Optional[str] = None
    ENTRA_CLIENT_SECRET: Optional[str] = None
    ENTRA_TENANT_ID: Optional[str] = None
    ENTRA_REDIRECT_URI: str = "http://localhost:5173/auth/entra/callback"
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
