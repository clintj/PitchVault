from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from app.core.database import get_db
from app.models.all import User, Folder
from app.schemas.all import FolderCreate, FolderUpdate, FolderResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/", response_model=FolderResponse)
async def create_folder(
    folder_in: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    folder = Folder(
        owner_id=current_user.id,
        name=folder_in.name,
        parent_id=folder_in.parent_id
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder

@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    parent_id: uuid.UUID = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Folder).where(Folder.owner_id == current_user.id)
    if parent_id:
        stmt = stmt.where(Folder.parent_id == parent_id)
    else:
        stmt = stmt.where(Folder.parent_id == None)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: uuid.UUID,
    folder_in: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalars().first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    for field, value in folder_in.dict(exclude_unset=True).items():
        setattr(folder, field, value)
        
    await db.commit()
    await db.refresh(folder)
    return folder

@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalars().first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    await db.delete(folder)
    await db.commit()
    return {"ok": True}
