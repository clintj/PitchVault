from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import string, random, uuid
from app.core.database import get_db
from app.schemas.all import ShareLinkCreate, ShareLinkResponse
from app.models.all import ShareLink, Document, User
from app.api.deps import get_current_user
from app.core.security import get_password_hash

router = APIRouter()

def generate_slug(length=8):
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(length))

@router.post("/", response_model=ShareLinkResponse)
async def create_share_link(share_in: ShareLinkCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify doc ownership
    result = await db.execute(select(Document).where(Document.id == share_in.document_id).where(Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    slug = generate_slug()
    hashed_pwd = get_password_hash(share_in.password) if share_in.password else None

    new_share = ShareLink(
        document_id=share_in.document_id,
        slug=slug,
        access_type=share_in.access_type,
        password_hash=hashed_pwd,
        allowed_emails=share_in.allowed_emails,
        expires_at=share_in.expires_at,
        max_views=share_in.max_views,
        require_name=share_in.require_name,
        created_by=current_user.id
    )
    db.add(new_share)
    await db.commit()
    await db.refresh(new_share)
    return new_share

@router.get("/document/{doc_id}", response_model=List[ShareLinkResponse])
async def list_document_shares(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id).where(Document.owner_id == current_user.id))
    if not result.scalars().first():
         raise HTTPException(status_code=404, detail="Document not found")
         
    shares = await db.execute(select(ShareLink).where(ShareLink.document_id == doc_id))
    return shares.scalars().all()

@router.delete("/{share_id}")
async def revoke_share(share_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    share_result = await db.execute(select(ShareLink).where(ShareLink.id == share_id).where(ShareLink.created_by == current_user.id))
    share = share_result.scalars().first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    share.is_revoked = True
    await db.commit()
    return {"status": "revoked"}
