from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_db
from app.schemas.all import DocumentCreate, DocumentResponse, DocumentUpdate
from app.models.all import Document, User
from app.api.deps import get_current_user
import uuid

router = APIRouter()

@router.post("/", response_model=DocumentResponse)
async def create_document(doc_in: DocumentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_doc = Document(
        owner_id=current_user.id,
        title=doc_in.title,
        description=doc_in.description,
        html_content=doc_in.html_content,
        folder_id=doc_in.folder_id
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    return new_doc

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(folder_id: str = "root", db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Document).where(Document.owner_id == current_user.id).where(Document.is_archived == False)
    
    if folder_id == "root":
        stmt = stmt.where(Document.folder_id == None)
    elif folder_id != "all":
        try:
            f_id = uuid.UUID(folder_id)
            stmt = stmt.where(Document.folder_id == f_id)
        except ValueError:
            pass
            
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id).where(Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: uuid.UUID, doc_in: DocumentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id).where(Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc_in.title is not None:
        doc.title = doc_in.title
    if doc_in.description is not None:
        doc.description = doc_in.description
    if doc_in.html_content is not None:
        doc.html_content = doc_in.html_content
        doc.version += 1
    if doc_in.folder_id is not None:
        doc.folder_id = doc_in.folder_id

    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/{doc_id}")
async def delete_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id).where(Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_archived = True
    await db.commit()
    return {"status": "archived"}
