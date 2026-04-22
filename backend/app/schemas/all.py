from pydantic import BaseModel, EmailStr, AnyUrl
from typing import Optional, List
from datetime import datetime
import uuid

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserAdminCreate(UserBase):
    password: str
    role: str = "owner"
    is_verified: bool = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = None

class UserResponse(UserBase):
    id: uuid.UUID
    avatar_url: Optional[str] = None
    role: str
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class FolderBase(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None

class FolderCreate(FolderBase):
    pass

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None

class FolderResponse(FolderBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    folder_id: Optional[uuid.UUID] = None

class DocumentCreate(DocumentBase):
    html_content: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    folder_id: Optional[uuid.UUID] = None

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    content_type: str
    html_content: Optional[str] = None
    version: int
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ShareLinkBase(BaseModel):
    document_id: uuid.UUID
    access_type: str = "public"
    allowed_emails: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    max_views: Optional[int] = None
    require_name: bool = False
    
class ShareLinkCreate(ShareLinkBase):
    password: Optional[str] = None

class ShareLinkResponse(ShareLinkBase):
    id: uuid.UUID
    slug: str
    view_count: int
    is_revoked: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ViewerAuth(BaseModel):
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    otp: Optional[str] = None

class ViewerSessionStart(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    
class SessionResponse(BaseModel):
    session_id: uuid.UUID
    access_token: str
