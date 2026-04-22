from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.schemas.all import UserCreate, UserResponse, Token
from app.models.all import User
from app.core.runtime_config import get_runtime_config

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_password,
        role="owner"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    config = get_runtime_config()
    if config.get("disable_password_auth"):
        entra_admin = await db.execute(
            select(User).where(User.role == "admin", User.entra_id.isnot(None), User.entra_id != "")
        )
        if entra_admin.scalars().first():
            raise HTTPException(status_code=403, detail="Password authentication is disabled.")

    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.get("/entra/login")
async def entra_login():
    # v2: Redirect to Microsoft Entra OAuth2 flow
    return {"message": "Entra ID flow not yet implemented for MVP. Please check settings."}

@router.get("/entra/callback")
async def entra_callback(code: str):
    # v2: Handle MSAL callback
    return {"message": "Entra ID callback not yet implemented."}
