from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.schemas import TodoModel
from services.time_utils import (
    parse_scheduled_time,
    get_upcoming_tasks_from_db,
    get_overdue_tasks_from_db,
    format_scheduled_time,
    minutes_until,
)


# ─── CRUD Operations ─────────────────────────────────────────────────────────

def add_todo(db: Session, task: str, scheduled_time: Optional[str] = None) -> TodoModel:
    """Add a new task, optionally with a scheduled time string."""
    parsed_time = parse_scheduled_time(scheduled_time) if scheduled_time else None
    db_todo = TodoModel(task=task, scheduled_time=parsed_time)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


def list_todos(db: Session) -> list[TodoModel]:
    """Return all todos ordered by scheduled_time (nulls last), then created_at."""
    return (
        db.query(TodoModel)
        .order_by(
            TodoModel.completed.asc(),
            TodoModel.scheduled_time.asc().nullslast(),
            TodoModel.created_at.asc(),
        )
        .all()
    )


def update_todo(
    db: Session,
    todo_id: int,
    task: Optional[str] = None,
    completed: Optional[bool] = None,
    scheduled_time: Optional[str] = None,
) -> Optional[TodoModel]:
    """Update a todo by ID. Supports task text, completion status, and scheduled_time."""
    db_todo = db.query(TodoModel).filter(TodoModel.id == todo_id).first()
    if not db_todo:
        return None
    if task is not None:
        db_todo.task = task
    if completed is not None:
        db_todo.completed = completed
    if scheduled_time is not None:
        db_todo.scheduled_time = parse_scheduled_time(scheduled_time)
    db.commit()
    db.refresh(db_todo)
    return db_todo


def delete_todo(db: Session, todo_id: int) -> bool:
    """Delete a todo by ID. Returns True if deleted."""
    db_todo = db.query(TodoModel).filter(TodoModel.id == todo_id).first()
    if db_todo:
        db.delete(db_todo)
        db.commit()
        return True
    return False


def get_upcoming_tasks(db: Session, within_minutes: int = 120) -> list[TodoModel]:
    return get_upcoming_tasks_from_db(db, within_minutes)


def get_overdue_tasks(db: Session) -> list[TodoModel]:
    return get_overdue_tasks_from_db(db)


# ─── Formatting helpers (for Gemini tool return values) ────────────────────

def format_todo_for_ai(t: TodoModel) -> str:
    """Human-readable single-task string for AI context."""
    status = "✓ done" if t.completed else "pending"
    time_part = ""
    if t.scheduled_time:
        mins = minutes_until(t.scheduled_time)
        time_str = format_scheduled_time(t.scheduled_time)
        if mins is not None and mins < 0:
            time_part = f" [OVERDUE — was due {time_str}]"
        elif mins is not None and mins <= 120:
            time_part = f" [due in {mins} min — {time_str}]"
        else:
            time_part = f" [scheduled {time_str}]"
    return f"[ID:{t.id}] {t.task} ({status}){time_part}"


def format_todos_list(todos: list[TodoModel]) -> str:
    if not todos:
        return "The to-do list is empty."
    return "; ".join(format_todo_for_ai(t) for t in todos)
