from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from sqlalchemy.sql import func
import uuid

class User(Base):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="owner")
    hashed_password = Column(String, nullable=True)
    entra_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Folder(Base):
    __tablename__ = 'folders'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    name = Column(String)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Document(Base):
    __tablename__ = 'documents'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), nullable=True)
    title = Column(String)
    description = Column(String, nullable=True)
    content_type = Column(String, default="html")
    content_key = Column(String, nullable=True)
    html_content = Column(Text, nullable=True)
    thumbnail_key = Column(String, nullable=True)
    version = Column(Integer, default=1)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DocumentVersion(Base):
    __tablename__ = 'document_versions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))
    version_number = Column(Integer)
    content_key = Column(String, nullable=True)
    html_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))

class ShareLink(Base):
    __tablename__ = 'share_links'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))
    slug = Column(String, unique=True, index=True)
    access_type = Column(String, default="public") # public, password, email_list, entra
    password_hash = Column(String, nullable=True)
    allowed_emails = Column(ARRAY(String), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_views = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)
    is_revoked = Column(Boolean, default=False)
    require_name = Column(Boolean, default=False)
    branding_logo_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))

class ViewerSession(Base):
    __tablename__ = 'viewer_sessions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_link_id = Column(UUID(as_uuid=True), ForeignKey('share_links.id'))
    viewer_email = Column(String, nullable=True)
    viewer_name = Column(String, nullable=True)
    ip_hash = Column(String)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    total_time_seconds = Column(Integer, default=0)
    is_complete = Column(Boolean, default=False)

class SectionEvent(Base):
    __tablename__ = 'section_events'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('viewer_sessions.id'))
    section_id = Column(String)
    event_type = Column(String) # enter, exit, scroll
    time_on_section_seconds = Column(Integer, default=0)
    scroll_depth_pct = Column(Integer, default=0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
