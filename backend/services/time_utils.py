import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import re

def get_current_time() -> datetime:
    """Get current time in local timezone."""
    return datetime.now(timezone.utc).astimezone()

def format_scheduled_time(dt: Optional[datetime]) -> Optional[str]:
    if not dt: return None
    return dt.astimezone().strftime("%b %d, %I:%M %p")

def parse_scheduled_time(time_str: Optional[str]) -> Optional[datetime]:
    """
    Robust time parsing with dateutil and a safe fallback.
    """
    if not time_str or not time_str.strip():
        return None

    now = get_current_time()
    s = time_str.strip().lower()

    # --- 1. Try dateutil (Preferred) ---
    try:
        from dateutil import parser
        dt = parser.parse(time_str, default=now, fuzzy=True)
        
        # Intelligent roll-forward
        if dt < now:
            date_indicators = ["tomorrow", "mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            if not any(ind in s for ind in date_indicators):
                dt += timedelta(days=1)
        return dt
    except (ImportError, Exception):
        # --- 2. Fallback: Simple Regex (if dateutil is missing or fails) ---
        print("[TimeUtils] Fallback parsing triggered.")
        try:
            # Look for "HH:MM" or "HH"
            match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', s)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                ampm = match.group(3)
                
                if ampm == 'pm' and hour < 12: hour += 12
                if ampm == 'am' and hour == 12: hour = 0
                
                dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if dt < now: dt += timedelta(days=1)
                return dt
        except:
            pass
    return None

def minutes_until(dt: Optional[datetime]) -> Optional[int]:
    if not dt: return None
    now = get_current_time()
    diff = dt - now
    return int(diff.total_seconds() / 60)

def get_upcoming_tasks_from_db(db, within_minutes: int = 120):
    """Fetch pending tasks due within the next N minutes."""
    from models.schemas import TodoModel
    now = get_current_time()
    future = now + timedelta(minutes=within_minutes)
    return (
        db.query(TodoModel)
        .filter(TodoModel.completed == False)
        .filter(TodoModel.scheduled_time != None)
        .filter(TodoModel.scheduled_time >= now)
        .filter(TodoModel.scheduled_time <= future)
        .order_by(TodoModel.scheduled_time.asc())
        .all()
    )

def get_overdue_tasks_from_db(db):
    """Fetch pending tasks that are past their scheduled time."""
    from models.schemas import TodoModel
    now = get_current_time()
    return (
        db.query(TodoModel)
        .filter(TodoModel.completed == False)
        .filter(TodoModel.scheduled_time != None)
        .filter(TodoModel.scheduled_time < now)
        .order_by(TodoModel.scheduled_time.asc())
        .all()
    )

def build_time_context(db) -> str:
    now = get_current_time()
    now_str = now.strftime("%A, %b %d, %Y, %I:%M %p")
    lines = [f"Current time: {now_str}"]
    
    # Add task summary to context
    upcoming = get_upcoming_tasks_from_db(db, within_minutes=120)
    overdue = get_overdue_tasks_from_db(db)
    
    if overdue:
        overdue_list = ", ".join([f"[ID:{t.id}] '{t.task}' (due {format_scheduled_time(t.scheduled_time)})" for t in overdue[:3]])
        lines.append(f"OVERDUE TASKS: {overdue_list}")
    
    if upcoming:
        upcoming_list = ", ".join([f"[ID:{t.id}] '{t.task}' at {format_scheduled_time(t.scheduled_time)}" for t in upcoming[:3]])
        lines.append(f"Upcoming: {upcoming_list}")
        
    return "\n".join(lines)
