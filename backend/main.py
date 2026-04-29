from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

# Load env variables before other imports
load_dotenv()

from models.database import engine, Base, SessionLocal
from routes import chat

# ─── Create / migrate tables ─────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# Safe migration: add scheduled_time column if it doesn't exist yet
def run_migrations():
    with engine.connect() as conn:
        try:
            # PostgreSQL syntax to check for column existence
            check_sql = text("SELECT 1 FROM information_schema.columns WHERE table_name='todos' AND column_name='scheduled_time'")
            exists = conn.execute(check_sql).fetchone()
            
            if not exists:
                print("[DB] Column 'scheduled_time' missing. Adding it...")
                conn.execute(text("ALTER TABLE todos ADD COLUMN scheduled_time TIMESTAMP WITH TIME ZONE"))
                conn.commit()
                print("[DB] Column 'scheduled_time' added successfully.")
            else:
                print("[DB] Migration: 'scheduled_time' column already exists.")
        except Exception as e:
            print(f"[DB] Migration note: {e}")
            try:
                conn.rollback()
            except:
                pass

run_migrations()

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nova Voice AI Agent API",
    description="Intelligent voice assistant with task management and memory.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        print(f"CRITICAL BACKEND ERROR: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Backend Error: {str(e)}"},
        )

app.include_router(chat.router, prefix="/api")


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Nova Voice AI Agent API v2.0",
        "docs": "/docs",
    }
