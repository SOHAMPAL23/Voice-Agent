import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Sparkles, Loader2, Brain, WifiOff } from 'lucide-react';
import { sendChatMessage, sendAudioMessage } from '../services/api';

export default function ChatInterface() {
  const { chatHistory, isProcessing, addChatMessage, setIsProcessing, setIsListening, isListening, setTodos, setMemories } = useAppStore();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  // ── Voice Logic (Inline) ──────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        await handleSend(transcript);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const handleSend = async (textOverride) => {
    const text = textOverride || inputText;
    if (!text.trim() || isProcessing) return;

    setInputText('');
    addChatMessage({ role: 'user', content: text });
    setIsProcessing(true);

    try {
      const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(text, history);
      addChatMessage({ role: 'agent', content: res.response });
      
      // Refresh data
      const { fetchTodos, fetchMemories } = await import('../services/api');
      const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
      setTodos(t);
      setMemories(m);
    } catch (err) {
      addChatMessage({ role: 'system', content: `Error: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a]/50 rounded-3xl overflow-hidden glass-panel relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Nova</p>
          <p className="text-[10px] text-slate-500">Voice Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {chatHistory.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-100'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isProcessing && <div className="text-xs text-slate-500 animate-pulse">Nova is thinking...</div>}
          <div ref={chatEndRef} />
        </AnimatePresence>
      </div>

      {/* Voice Only Interaction */}
      <div className="p-8 border-t border-white/5 flex flex-col items-center gap-3">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-6 rounded-full transition-all ${isListening ? 'bg-red-500 text-white scale-110 shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'}`}
        >
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {isListening ? 'Listening...' : 'Tap to Talk'}
        </span>
      </div>
    </div>
  );
}
