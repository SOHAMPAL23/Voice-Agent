# Nova — Voice-Based AI Agent v2.0

A Intelligent voice assistant with task management, memory, and time-aware scheduling.

## ✨ Features

| Feature | Details |
|---|---|
| 🎤 Voice I/O | Web Speech API (STT + TTS), auto-stop on silence |
| 🌊 Waveform | 12-bar animated waveform while listening |
| ⌨️ Space bar shortcut | Press Space to toggle mic (when not in a text field) |
| 🛠 Smart To-Do | Add/update/delete/list tasks with `scheduled_time` |
| ⏰ Time-Aware AI | Knows current time, upcoming tasks, overdue alerts |
| 🧠 Memory | Stores habits, facts, preferences — persists in PostgreSQL |
| 🔔 Toast Notifications | Animated success/warning/error/info toasts |
| 📋 Sidebar | Color-coded task badges (overdue/urgent/upcoming/future) |
| 🤖 Gemini 2.5 Flash | Real tool calling — not JSON parsing hacks |

## 🏗 Architecture

```
Voice Agent/
├── backend/
│   ├── main.py                  # FastAPI app + DB migration
│   ├── .env                     # GEMINI_API_KEY, DATABASE_URL
│   ├── models/
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   └── schemas.py           # ORM models + Pydantic schemas
│   ├── routes/
│   │   └── chat.py              # /chat, /chat-audio, /todos, /memories
│   └── services/
│       ├── agent.py             # System prompt builder + Gemini tools
│       ├── gemini.py            # Retry logic + audio/text dispatch
│       ├── tools.py             # CRUD for todos with scheduled_time
│       ├── memory.py            # CRUD for memories
│       └── time_utils.py        # Time parsing, upcoming/overdue queries
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── ChatInterface.jsx  # Voice + text chat, waveform, space bar
        │   ├── Sidebar.jsx        # Tasks with time badges + memory
        │   └── Toast.jsx          # Animated toast notifications
        ├── services/
        │   └── api.js             # All API calls (chat, todos, memories)
        └── store/
            └── useAppStore.js     # Zustand state (todos, memories, toasts)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Neon PostgreSQL database (or any PostgreSQL)

### 1. Configure Environment
```
backend/.env  ← already configured with your keys
```

### 2. Start Everything
```powershell
.\start.ps1
```

Or manually:

**Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

Open: http://localhost:5173

## 🎙 Voice Commands

| Say... | Action |
|---|---|
| "Add study DSA at 6 PM" | Creates task with scheduled time |
| "Add a task to call mum" | Creates task (Nova asks for time) |
| "What are my tasks?" | Lists all todos |
| "What should I do now?" | Time-aware smart suggestion |
| "What's coming up?" | Shows tasks in next 2 hours |
| "Mark task 3 as done" | Updates todo status |
| "Delete task 2" | Removes task |
| "Remember I go to gym at 7 AM" | Saves to memory |

## 🔧 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | Text message |
| `/api/chat-audio` | POST | Audio + transcript |
| `/api/todos` | GET | All todos |
| `/api/todos/upcoming` | GET | Tasks in next 2 hours |
| `/api/todos/{id}` | PATCH | Update todo |
| `/api/todos/{id}` | DELETE | Delete todo |
| `/api/memories` | GET | All memories |
| `/api/memories/{id}` | DELETE | Delete memory |

## 🌐 Tech Stack

- **Backend**: FastAPI · SQLAlchemy · PostgreSQL (Neon) · Gemini 2.5 Flash
- **Frontend**: React · Vite · Tailwind CSS v4 · Framer Motion · Zustand · Lucide Icons
