import os
import tempfile
from sqlalchemy.orm import Session
from services import agent
import google.generativeai as genai

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
    Process voice input. Uses Gemini for transcription if needed, 
    then forwards to OpenRouter for the text response.
    """
    if not transcript or not transcript.strip():
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
                    f.write(audio_bytes)
                    temp_path = f.name
                try:
                    sample_file = genai.upload_file(path=temp_path)
                    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
                    response = model.generate_content([sample_file, "Transcribe this audio exactly as spoken. Return only the transcription."])
                    genai.delete_file(sample_file.name)
                    transcript = response.text.strip()
                    print(f"Transcribed audio: {transcript}")
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
            except Exception as e:
                print(f"Transcription error: {e}")

    if not transcript or not transcript.strip():
        return "I heard you, but my voice processing was unable to transcribe it. Please speak more clearly or type your message."

    return get_ai_response(transcript.strip(), db, history=history)

