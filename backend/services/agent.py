import os
from sqlalchemy.orm import Session
from openai import OpenAI

from . import tools as todo_tools
from . import memory as memory_tools
from .time_utils import build_time_context

# --- Multi-Provider Configuration ---
RAW_OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
RAW_GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

API_KEY = RAW_OPENAI_KEY or RAW_GEMINI_KEY
MODEL = "gpt-4o-mini" 

is_openrouter = str(API_KEY).startswith("sk-or-")

if is_openrouter:
    print("[Agent] Config: OpenRouter (via Gemini 2.0 Flash)")
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=API_KEY,
    )
    MODEL = "google/gemini-2.0-flash-001"
else:
    print("[Agent] Config: OpenAI Direct (via GPT-4o-mini)")
    client = OpenAI(api_key=API_KEY)

SYSTEM_PROMPT_TEMPLATE = """\
You are Nova, a smart and friendly AI voice assistant.
You have persistent memory and full task management capabilities.

ORGANIZATION RULES:
- MEMORY: Use 'addMemory' for any personal fact, preference, or piece of information the user shares. BE PROACTIVE: If the user says "I like coffee" or "I am a doctor", save it even if they don't explicitly ask you to remember.
- TASKS: Use 'addTodo' for any action, chore, or plan (e.g., "I need to study", "Buy milk at 5 PM").

YOUR JOB:
- Be a proactive listener: Save important details about the user's life automatically.
- CRITICAL: You MUST call the tool first before confirming to the user.
- ID DISCOVERY: If the user asks to delete or update a task by name and you don't know the ID, call 'listTodos' first to find it.
- Respond like a warm human assistant (1–3 sentences max).
- If a task has no time, add it as 'pending'.

{time_context}

USER MEMORY:
{memory_context}
"""

def get_tools_schema():
    return [
        {
            "type": "function",
            "function": {
                "name": "addTodo",
                "description": "Add a new task to the to-do list.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task": {"type": "string", "description": "The task text"},
                        "scheduled_time": {"type": "string", "description": "Optional time"}
                    },
                    "required": ["task"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "addMemory",
                "description": "Save a piece of information to the user's permanent memory bank.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "The fact to save"}
                    },
                    "required": ["content"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "listTodos",
                "description": "List current tasks.",
                "parameters": {"type": "object", "properties": {}}
            }
        },
        {
            "type": "function",
            "function": {
                "name": "updateTodo",
                "description": "Update an existing task. Provide either 'id' OR 'task_name'.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "task_name": {"type": "string", "description": "Name of the task to find"},
                        "new_task": {"type": "string", "description": "New description"},
                        "new_time": {"type": "string", "description": "New time"},
                        "status": {"type": "string", "enum": ["completed", "pending"]}
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "deleteTodo",
                "description": "Remove a task. Provide either 'id' or 'task_name'.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "task_name": {"type": "string", "description": "Name of the task to delete"}
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "deleteMemory",
                "description": "Remove a memory.",
                "parameters": {
                    "type": "object",
                    "properties": {"id": {"type": "integer"}},
                    "required": ["id"]
                }
            }
        }
    ]

def execute_tool(name, args, db: Session):
    from models.schemas import TodoModel
    print(f"[ACTION] Running {name} with: {args}")
    
    def resolve_id(id_val, name_val):
        if id_val: return id_val
        if not name_val: return None
        # Simple fuzzy search
        found = db.query(TodoModel).filter(TodoModel.task.ilike(f"%{name_val}%")).first()
        return found.id if found else None

    try:
        if name == "addTodo":
            todo = todo_tools.add_todo(db, args.get("task"), args.get("scheduled_time"))
            return f"Saved Task: {todo.task} (ID:{todo.id})"
        elif name == "addMemory":
            mem = memory_tools.add_memory(db, args.get("content"))
            return f"Saved Memory: {mem.content} (ID:{mem.id})"
        elif name == "listTodos":
            return todo_tools.format_todos_list(todo_tools.list_todos(db))
        elif name == "updateTodo":
            tid = resolve_id(args.get("id"), args.get("task_name"))
            if not tid: return "Error: Could not find that task."
            todo_tools.update_todo(
                db, 
                todo_id=tid, 
                task=args.get("new_task"),
                scheduled_time=args.get("new_time"),
                completed=(args.get("status") == "completed") if args.get("status") else None
            )
            return "Task updated successfully."
        elif name == "deleteTodo":
            tid = resolve_id(args.get("id"), args.get("task_name"))
            if not tid: return "Error: Could not find that task."
            todo_tools.delete_todo(db, tid)
            return "Task deleted."
        elif name == "deleteMemory":
            memory_tools.delete_memory(db, args.get("id"))
            return "Memory deleted."
    except Exception as e:
        print(f"[ERROR] Tool {name} failed: {e}")
        db.rollback()
        return f"Tool error: {str(e)}"
    return "Unknown tool."

def get_nova_response(messages, db: Session):
    memory_context = memory_tools.format_memories_context(db)
    time_context   = build_time_context(db)
    
    system_instruction = (
        SYSTEM_PROMPT_TEMPLATE
        .replace("{time_context}", time_context)
        .replace("{memory_context}", memory_context)
    )

    full_messages = [{"role": "system", "content": system_instruction}] + messages
    
    headers = {"HTTP-Referer": "http://localhost:3000", "X-Title": "Nova"} if is_openrouter else None

    import json
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=full_messages,
            tools=get_tools_schema(),
            tool_choice="auto",
            extra_headers=headers
        )
        
        msg = response.choices[0].message
        
        if msg.tool_calls:
            print(f"[Agent] Executing {len(msg.tool_calls)} actions...")
            full_messages.append(msg)
            
            for tool in msg.tool_calls:
                name = tool.function.name
                args = json.loads(tool.function.arguments)
                result = execute_tool(name, args, db)
                
                full_messages.append({
                    "tool_call_id": tool.id,
                    "role": "tool",
                    "name": name,
                    "content": result,
                })
            
            final = client.chat.completions.create(
                model=MODEL,
                messages=full_messages,
                extra_headers=headers if is_openrouter else None
            )
            final_content = final.choices[0].message.content
            return final_content if final_content else "Action completed. What's next?"
            
        if msg.content:
            return msg.content
        
        return "I'm here. What can I do for you?"
    except Exception as e:
        print(f"[Critical Error] {e}")
        return f"I'm having trouble thinking clearly. Error: {str(e)}"
