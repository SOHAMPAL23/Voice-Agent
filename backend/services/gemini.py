import os
import time
from sqlalchemy.orm import Session
from services import agent

def get_ai_response(user_input: str, db: Session, history: list = None) -> str:
    """Process a text message through the Nova agent (OpenRouter)."""
    # Convert history to OpenAI format
    messages = []
    if history:
        for msg in history:
            role = "assistant" if msg["role"] == "model" else msg["role"]
            messages.append({"role": role, "content": msg["content"]})
    
    messages.append({"role": "user", "content": user_input})
    
    return agent.get_nova_response(messages, db)

def get_ai_audio_response(audio_bytes: bytes, mime_type: str, transcript: str, db: Session, history: list = None) -> str:
    """
    Process voice input via OpenRouter.
    Note: OpenRouter's Gemini 1.5 Flash supports audio if sent via a specific format,
    but it's safer to use the transcript if available. 
    If transcript is empty, we warn the user as pure audio streaming to OpenRouter 
    is slightly different from the Google SDK.
    """
    if not transcript or not transcript.strip():
        return "I heard you, but my voice processing via OpenRouter is currently text-based. Please speak more clearly or type your message."

    return get_ai_response(transcript.strip(), db, history=history)
