from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from datetime import datetime, timezone, timedelta
from jose import jwt
import uuid, hashlib
from pydantic import BaseModel
from app.core.database import get_db
from app.schemas.all import ViewerAuth, ViewerSessionStart, SessionResponse, DocumentResponse
from app.models.all import ShareLink, Document, ViewerSession
from app.core.security import verify_password
from app.core.config import settings

router = APIRouter()

def create_viewer_token(share_id: uuid.UUID):
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {"sub": str(share_id), "type": "viewer", "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

async def get_share_by_ref(ref: str, db: AsyncSession):
    conditions = [ShareLink.slug == ref]
    try:
        ref_uuid = uuid.UUID(ref)
        conditions.extend([ShareLink.id == ref_uuid, ShareLink.document_id == ref_uuid])
    except ValueError:
        pass

    result = await db.execute(select(ShareLink).where(or_(*conditions)).order_by(ShareLink.created_at.desc()))
    return result.scalars().first()

@router.get("/{slug}")
async def resolve_share(slug: str, db: AsyncSession = Depends(get_db)):
    share = await get_share_by_ref(slug, db)
    if not share or share.is_revoked:
        raise HTTPException(status_code=404, detail="Link not found or revoked")
    
    if share.expires_at and share.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Link expired")

    doc_result = await db.execute(select(Document).where(Document.id == share.document_id))
    doc = doc_result.scalars().first()
    
    return {
        "title": doc.title,
        "access_type": share.access_type,
        "require_name": share.require_name,
        "branding_logo_key": share.branding_logo_key
    }

@router.post("/{slug}/auth")
async def verify_access(slug: str, auth_data: ViewerAuth, db: AsyncSession = Depends(get_db)):
    share = await get_share_by_ref(slug, db)
    if not share or share.is_revoked:
        raise HTTPException(status_code=404, detail="Link not found or revoked")
        
    if share.access_type == "password":
        if not share.password_hash or not verify_password(auth_data.password, share.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
    elif share.access_type == "email":
        if share.allowed_emails and auth_data.email not in share.allowed_emails:
            raise HTTPException(status_code=403, detail="Email not allowed")
        # OTP verification logic goes here for v2
    elif share.access_type != "public":
        raise HTTPException(status_code=403, detail="Unsupported access type")
        
    return {"viewer_token": create_viewer_token(share.id)}

@router.post("/{slug}/session/start", response_model=SessionResponse)
async def start_session(slug: str, req: Request, session_data: ViewerSessionStart, db: AsyncSession = Depends(get_db)):
    share = await get_share_by_ref(slug, db)
    if not share or share.is_revoked:
        raise HTTPException(status_code=404, detail="Link not found or revoked")
    
    ip = req.client.host if req.client else "unknown"
    ip_hash = hashlib.sha256(f"{ip}{datetime.now().date()}".encode()).hexdigest()
    
    user_agent = req.headers.get("user-agent", "unknown")
    
    new_session = ViewerSession(
        share_link_id=share.id,
        viewer_email=session_data.email,
        viewer_name=session_data.name,
        ip_hash=ip_hash,
        user_agent=user_agent
    )
    db.add(new_session)
    share.view_count += 1
    await db.commit()
    await db.refresh(new_session)
    
    return {
        "session_id": new_session.id,
        "access_token": create_viewer_token(share.id)
    }

class SessionAction(BaseModel):
    session_id: uuid.UUID

@router.post("/{slug}/session/heartbeat")
async def heartbeat_session(slug: str, action: SessionAction, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ViewerSession).where(ViewerSession.id == action.session_id))
    session = result.scalars().first()
    if session:
        session.last_seen_at = datetime.now(timezone.utc)
        # simplistic total time increment by 15 sec assuming heartbeat interval
        session.total_time_seconds += 15
        await db.commit()
    return {"status": "ok"}

@router.post("/{slug}/session/end")
async def end_session(slug: str, action: SessionAction, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ViewerSession).where(ViewerSession.id == action.session_id))
    session = result.scalars().first()
    if session:
        session.is_complete = True
        await db.commit()
    return {"status": "ok"}

@router.get("/{slug}/content", response_model=DocumentResponse)
async def get_content(slug: str, token: str, db: AsyncSession = Depends(get_db)):
    # Very basic token validation for MVP
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "viewer":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    share = await get_share_by_ref(slug, db)
    if not share or str(share.id) != payload.get("sub"):
        raise HTTPException(status_code=403, detail="Invalid access")
        
    doc_result = await db.execute(select(Document).where(Document.id == share.document_id))
    return doc_result.scalars().first()
