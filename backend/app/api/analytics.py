from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
import uuid
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.all import ShareLink, Document, ViewerSession, User

router = APIRouter()


class ViewerSessionDetail(BaseModel):
    viewer_name: Optional[str] = None
    viewer_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    started_at: datetime
    total_time_seconds: int

    class Config:
        from_attributes = True


class ShareLinkAnalytics(BaseModel):
    slug: str
    expires_at: Optional[datetime] = None
    is_revoked: bool
    view_count: int
    sessions: List[ViewerSessionDetail]

    class Config:
        from_attributes = True


class DocumentAnalytics(BaseModel):
    document_id: uuid.UUID
    document_title: str
    shares: List[ShareLinkAnalytics]


@router.get("/document/{doc_id}", response_model=DocumentAnalytics)
async def get_document_analytics(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc_result = await db.execute(
        select(Document).where(
            and_(
                Document.id == doc_id,
                Document.owner_id == current_user.id
            )
        )
    )
    doc = doc_result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    shares_result = await db.execute(
        select(ShareLink).where(ShareLink.document_id == doc_id)
    )
    shares = shares_result.scalars().all()

    shares_analytics = []
    for share in shares:
        sessions_result = await db.execute(
            select(ViewerSession).where(ViewerSession.share_link_id == share.id)
        )
        sessions = sessions_result.scalars().all()

        shares_analytics.append(ShareLinkAnalytics(
            slug=share.slug,
            expires_at=share.expires_at,
            is_revoked=share.is_revoked,
            view_count=share.view_count,
            sessions=[ViewerSessionDetail.from_orm(s) for s in sessions]
        ))

    return DocumentAnalytics(
        document_id=doc_id,
        document_title=doc.title,
        shares=shares_analytics
    )
