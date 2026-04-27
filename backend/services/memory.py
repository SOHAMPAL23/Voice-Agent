from sqlalchemy.orm import Session
from models.schemas import MemoryModel


def add_memory(db: Session, content: str) -> MemoryModel:
    """Save a personal fact, habit, or preference about the user."""
    db_memory = MemoryModel(content=content)
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory


def list_memories(db: Session) -> list[MemoryModel]:
    """Return all stored memories, newest first."""
    return db.query(MemoryModel).order_by(MemoryModel.created_at.desc()).all()


def delete_memory(db: Session, memory_id: int) -> bool:
    """Delete a memory by ID."""
    m = db.query(MemoryModel).filter(MemoryModel.id == memory_id).first()
    if m:
        db.delete(m)
        db.commit()
        return True
    return False


def format_memories_context(db: Session) -> str:
    """Build a memory context string for injection into the system prompt."""
    memories = list_memories(db)
    if not memories:
        return "No memories stored yet."
    return "\n".join(f"- {m.content}" for m in memories)
