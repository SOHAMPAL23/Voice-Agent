from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.database import Base


# ─── SQLAlchemy ORM Models ────────────────────────────────────────────────────

class TodoModel(Base):
    __tablename__ = "todos"
    id             = Column(Integer, primary_key=True, index=True)
    task           = Column(String, index=True)
    completed      = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    scheduled_time = Column(DateTime(timezone=True), nullable=True)


class MemoryModel(Base):
    __tablename__ = "memories"
    id         = Column(Integer, primary_key=True, index=True)
    content    = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TodoBase(BaseModel):
    task: str


class TodoCreate(TodoBase):
    scheduled_time: Optional[datetime] = None


class TodoUpdate(BaseModel):
    task:           Optional[str]      = None
    completed:      Optional[bool]     = None
    scheduled_time: Optional[datetime] = None


class TodoResponse(TodoBase):
    id:             int
    completed:      bool
    created_at:     datetime
    scheduled_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemoryBase(BaseModel):
    content: str


class MemoryCreate(MemoryBase):
    pass


class MemoryResponse(MemoryBase):
    id:         int
    created_at: datetime

    class Config:
        from_attributes = True
