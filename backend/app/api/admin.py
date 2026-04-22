from typing import List
import uuid
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.runtime_config import get_runtime_config, save_runtime_config
from app.models.all import Document, ShareLink, User, ViewerSession
from app.schemas.all import UserAdminCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash

router = APIRouter()


class AdminSettingsUpdate(BaseModel):
    entra_client_id: str = ""
    entra_tenant_id: str = ""
    entra_redirect_uri: str = ""
    admin_entra_id: str = ""
    disable_password_auth: bool = False


def require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


async def has_entra_admin(db: AsyncSession) -> bool:
    result = await db.execute(
        select(User).where(User.role == "admin", User.entra_id.isnot(None), User.entra_id != "")
    )
    return result.scalars().first() is not None


@router.get("/settings/public")
async def public_settings(db: AsyncSession = Depends(get_db)):
    config = get_runtime_config()
    return {
        "password_auth_disabled": bool(config.get("disable_password_auth")) and await has_entra_admin(db),
        "entra_configured": bool(config.get("entra_client_id") and config.get("entra_tenant_id")),
    }


@router.get("/settings")
async def get_admin_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)
    config = get_runtime_config()
    return {
        **config,
        "admin_entra_id": current_user.entra_id or "",
        "has_entra_admin": await has_entra_admin(db),
    }


@router.put("/settings")
async def update_admin_settings(
    payload: AdminSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)

    if payload.admin_entra_id.strip():
        current_user.entra_id = payload.admin_entra_id.strip()
        await db.commit()
        await db.refresh(current_user)

    entra_admin_exists = await has_entra_admin(db)
    if payload.disable_password_auth and not entra_admin_exists:
        raise HTTPException(
            status_code=400,
            detail="Password auth can only be disabled after an Entra ID admin is present.",
        )

    config = save_runtime_config(
        {
            "entra_client_id": payload.entra_client_id.strip(),
            "entra_tenant_id": payload.entra_tenant_id.strip(),
            "entra_redirect_uri": payload.entra_redirect_uri.strip(),
            "disable_password_auth": payload.disable_password_auth,
        }
    )
    return {**config, "admin_entra_id": current_user.entra_id or "", "has_entra_admin": entra_admin_exists}


@router.get("/audit")
async def audit_log(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)

    doc_rows = await db.execute(
        select(Document).where(Document.owner_id == current_user.id).order_by(desc(Document.created_at)).limit(20)
    )
    share_rows = await db.execute(
        select(ShareLink).where(ShareLink.created_by == current_user.id).order_by(desc(ShareLink.created_at)).limit(20)
    )
    session_rows = await db.execute(
        select(ViewerSession).order_by(desc(ViewerSession.started_at)).limit(20)
    )

    events = []
    for doc in doc_rows.scalars().all():
        events.append({
            "time": doc.created_at,
            "type": "document",
            "message": f"Document created: {doc.title}",
        })
    for share in share_rows.scalars().all():
        events.append({
            "time": share.created_at,
            "type": "share",
            "message": f"Share created: /v/{share.slug}",
        })
    for session in session_rows.scalars().all():
        events.append({
            "time": session.started_at,
            "type": "viewer",
            "message": f"Viewer session started: {session.viewer_email or session.viewer_name or 'anonymous'}",
        })

    return sorted(events, key=lambda item: item["time"] or datetime.min, reverse=True)[:40]


@router.get("/analytics")
async def analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)

    documents = await db.scalar(select(func.count()).select_from(Document).where(Document.owner_id == current_user.id))
    active_documents = await db.scalar(
        select(func.count()).select_from(Document).where(Document.owner_id == current_user.id, Document.is_archived == False)
    )
    shares = await db.scalar(select(func.count()).select_from(ShareLink).where(ShareLink.created_by == current_user.id))
    sessions = await db.scalar(select(func.count()).select_from(ViewerSession))
    views = await db.scalar(select(func.coalesce(func.sum(ShareLink.view_count), 0)).where(ShareLink.created_by == current_user.id))

    top_rows = await db.execute(
        select(ShareLink.slug, ShareLink.view_count).where(ShareLink.created_by == current_user.id).order_by(desc(ShareLink.view_count)).limit(5)
    )

    return {
        "documents": documents or 0,
        "active_documents": active_documents or 0,
        "shares": shares or 0,
        "viewer_sessions": sessions or 0,
        "total_views": views or 0,
        "top_shares": [{"slug": slug, "views": count} for slug, count in top_rows.all()],
    }

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserResponse)
async def create_user(
    payload: UserAdminCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)
    
    # Check if user already exists
    existing_user = await db.execute(select(User).where(User.email == payload.email))
    if existing_user.scalars().first():
        raise HTTPException(status_code=400, detail="User with this email already exists")
        
    new_user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_verified=payload.is_verified
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.email is not None:
        user.email = payload.email
    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    if payload.password is not None:
        user.hashed_password = get_password_hash(payload.password)
        
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_admin(current_user)
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.delete(user)
    await db.commit()
    return None
