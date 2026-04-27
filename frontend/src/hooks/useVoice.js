import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { sendAudioToNova, isProcessing } = useAppStore();

  const startListening = useCallback(async () => {
    if (isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) { // Only send if it's not a tiny accidental click
          await sendAudioToNova(audioBlob);
        }
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use the voice agent.");
    }
  }, [sendAudioToNova, isProcessing]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, startListening, stopListening };
}
