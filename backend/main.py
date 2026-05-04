import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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
def initialize_db():
    try:
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Migration for scheduled_time
        with engine.connect() as conn:
            try:
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
                print(f"[DB] Migration note (non-critical): {e}")
                try:
                    conn.rollback()
                except:
                    pass
    except Exception as e:
        print(f"[DB] CRITICAL STARTUP ERROR: Could not initialize database. Error: {e}")

# Call initialization
initialize_db()

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
async def log_and_catch_exceptions(request: Request, call_next):
    # Log incoming request path (useful for debugging Vercel rewrites)
    print(f"[API] Request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        print(f"CRITICAL BACKEND ERROR: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "message": str(e),
                "path": request.url.path
            },
        )

# Include routers
# We include it twice or with prefix to handle both /api/chat and /chat if rewrites vary
app.include_router(chat.router, prefix="/api")
app.include_router(chat.router) # Fallback for non-prefixed calls


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Nova Voice AI Agent API v2.0",
        "docs": "/docs",
    }
