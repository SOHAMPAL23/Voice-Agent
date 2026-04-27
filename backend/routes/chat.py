from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from models import database, schemas
from services import gemini, tools, memory
from services.time_utils import get_upcoming_tasks_from_db
from google.api_core.exceptions import ResourceExhausted

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str

@router.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0"}

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, db: Session = Depends(database.get_db)):
    try:
        # Convert Pydantic models to dicts for Gemini
        history_dicts = []
        for h in req.history:
            history_dicts.append({"role": h.role, "content": h.content})
            
        reply = gemini.get_ai_response(req.message, db, history=history_dicts)
        return ChatResponse(response=reply)
    except ResourceExhausted:
        raise HTTPException(
            status_code=429,
            detail="Nova is overwhelmed. Please wait a moment.",
        )
    except Exception as e:
        import traceback
        print(f"[/chat] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/chat-audio", response_model=ChatResponse)
async def chat_audio_endpoint(
    audio: UploadFile = File(...),
    transcript: Optional[str] = Form(default=""),
    history: Optional[str] = Form(default="[]"),
    db: Session = Depends(database.get_db),
):
    try:
        audio_bytes = await audio.read()
        mime_type   = audio.content_type or "audio/webm"
        if ";" in mime_type:
            mime_type = mime_type.split(";")[0]

        try:
            history_list = json.loads(history)
        except:
            history_list = []

        reply = gemini.get_ai_audio_response(audio_bytes, mime_type, transcript or "", db, history=history_list)
        return ChatResponse(response=reply)
    except ResourceExhausted:
        raise HTTPException(
            status_code=429,
            detail="Nova is overwhelmed. Please wait a moment.",
        )
    except Exception as e:
        import traceback
        print(f"[/chat-audio] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Todos ---
@router.get("/todos", response_model=List[schemas.TodoResponse])
def get_todos(db: Session = Depends(database.get_db)):
    return tools.list_todos(db)

@router.get("/todos/upcoming", response_model=List[schemas.TodoResponse])
def get_upcoming(within_minutes: int = 120, db: Session = Depends(database.get_db)):
    return get_upcoming_tasks_from_db(db, within_minutes=within_minutes)

@router.patch("/todos/{todo_id}", response_model=schemas.TodoResponse)
def patch_todo(todo_id: int, update: schemas.TodoUpdate, db: Session = Depends(database.get_db)):
    result = tools.update_todo(db, todo_id=todo_id, task=update.task, completed=update.completed)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result

@router.delete("/todos/{todo_id}")
def delete_todo_endpoint(todo_id: int, db: Session = Depends(database.get_db)):
    if tools.delete_todo(db, todo_id):
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Task not found")

# --- Memories ---
@router.get("/memories", response_model=List[schemas.MemoryResponse])
def get_memories(db: Session = Depends(database.get_db)):
    return memory.list_memories(db)

@router.delete("/memories/{memory_id}")
def delete_memory_endpoint(memory_id: int, db: Session = Depends(database.get_db)):
    if memory.delete_memory(db, memory_id):
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Memory not found")
