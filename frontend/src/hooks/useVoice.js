import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useVoice() {
  const { sendAudioToNova, isProcessing, setIsListening: setStoreListening } = useAppStore();
  const [isListening, setIsListening] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(0);

  // Sync local isListening to store
  useEffect(() => {
    setStoreListening(isListening);
  }, [isListening, setStoreListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startListening = useCallback(async () => {
    if (isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Audio Context for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      audioContextRef.current = audioContext;
      setAnalyser(analyserNode);

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - recordingStartTimeRef.current;
        const type = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        
        // Ensure we have a minimum amount of data (0.5s or significant size)
        if (duration > 500 && audioBlob.size > 2000) {
          await sendAudioToNova(audioBlob);
        }

        // Cleanup tracks
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
        setAnalyser(null);
      };

      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(200); // Collect data every 200ms
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      let msg = "Could not start voice recording.";
      if (err.name === 'NotAllowedError') msg = "Microphone access denied. Please allow it.";
      else if (err.name === 'NotFoundError') msg = "No microphone found.";
      alert(msg);
    }
  }, [sendAudioToNova, isProcessing]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, startListening, stopListening, analyser };
}
