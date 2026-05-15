import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Send, Sparkles, Loader2, Brain, 
  User, Bot, MessageSquare, Waves, Settings2,
  ShieldCheck, Activity, Zap, Volume2, VolumeX
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { sendChatMessage, fetchTodos, fetchMemories } from '../services/api';
import { useVoice } from '../hooks/useVoice';
import { useTTS } from '../hooks/useTTS';
import VoiceOrb from './ui/VoiceOrb';
import TranscriptView from './TranscriptView';

export default function ChatInterface() {
  const { 
    chatHistory, isProcessing, addChatMessage, 
    setIsProcessing, setTodos, setMemories 
  } = useAppStore();
  
  const [inputText, setInputText] = useState('');
  const [viewMode, setViewMode] = useState('orb'); // 'orb' | 'transcript'
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef(null);
  
  const { isListening, startListening, stopListening, analyser } = useVoice();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      
      if (e.code === 'Space' && !isListening && !isProcessing) {
        e.preventDefault();
        startListening();
      }
      if (e.code === 'Escape') {
        stopTTS();
        setIsProcessing(false);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && isListening) {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, isProcessing, startListening, stopListening, stopTTS, setIsProcessing]);

  // Determine current AI state for the orb
  const aiState = useMemo(() => {
    if (isListening) return 'listening';
    if (isProcessing) return 'thinking';
    if (isSpeaking) return 'speaking';
    return 'idle';
  }, [isListening, isProcessing, isSpeaking]);

  const handleSend = async (textOverride) => {
    const text = textOverride || inputText;
    if (!text.trim() || isProcessing) return;

    setInputText('');
    addChatMessage({ role: 'user', content: text });
    setIsProcessing(true);

    try {
      const history = chatHistory.map(m => ({ 
        role: m.role === 'agent' ? 'model' : m.role, 
        content: m.content 
      }));
      const res = await sendChatMessage(text, history);
      addChatMessage({ role: 'agent', content: res.response });
      
      if (!isMuted) speak(res.response);

      const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
      setTodos(t);
      setMemories(m);
    } catch (err) {
      addChatMessage({ role: 'system', content: `Neural Error: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative group/chat transition-all duration-700">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            opacity: aiState === 'listening' ? 0.4 : aiState === 'thinking' ? 0.3 : 0.1,
            scale: aiState === 'speaking' ? [1, 1.1, 1] : 1
          }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[120px] rounded-full transition-colors duration-1000 ${
            aiState === 'listening' ? 'bg-emerald-500/20' :
            aiState === 'thinking' ? 'bg-indigo-500/20' :
            aiState === 'speaking' ? 'bg-cyan-500/20' : 'bg-blue-500/10'
          }`}
        />
      </div>

      {/* Header Widget */}
      <div className="flex items-center justify-between px-10 py-6 relative z-20 border-b border-white/5 bg-white/2 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Brain size={20} className={aiState !== 'idle' ? 'text-indigo-400' : 'text-slate-400'} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Aurora <span className="text-indigo-400">AI</span></h2>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${aiState !== 'idle' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{aiState}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(v => v === 'orb' ? 'transcript' : 'orb')}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/15 transition-all flex items-center gap-2"
          >
            {viewMode === 'orb' ? (
              <><MessageSquare size={18} /><span className="text-[10px] font-bold uppercase tracking-widest">Transcript</span></>
            ) : (
              <><Waves size={18} /><span className="text-[10px] font-bold uppercase tracking-widest">Focus Mode</span></>
            )}
          </button>
        </div>
      </div>

      {/* Main Experience Area */}
      <div className="flex-1 relative z-10 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {viewMode === 'orb' ? (
            <motion.div 
              key="orb-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-2xl aspect-square relative flex items-center justify-center">
                <VoiceOrb state={aiState} analyser={analyser} />
                
                {/* Floating Status Indicator */}
                <AnimatePresence>
                  {aiState !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute bottom-10 px-6 py-3 glass-card rounded-2xl border-white/10 text-center"
                    >
                      <p className={`text-xs font-bold uppercase tracking-[0.2em] shimmer-text ${
                        aiState === 'listening' ? 'text-emerald-400' :
                        aiState === 'thinking' ? 'text-purple-400' : 'text-cyan-400'
                      }`}>
                        {aiState === 'listening' ? 'Neural Link Active' : 
                         aiState === 'thinking' ? 'Synthesizing Response' : 'Audio Stream Active'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="transcript-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0 p-8"
            >
              <TranscriptView messages={chatHistory} isProcessing={isProcessing} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Futuristic Control Bar */}
      <div className="p-8 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-2 flex items-center gap-3 border-white/10 shadow-2xl">
            
            {/* Voice Control Cluster */}
            <div className="flex items-center gap-2 pl-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-2xl transition-all ${isMuted ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/5 text-blue-400'}`}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </motion.button>
              
              <div className="h-6 w-[1px] bg-white/5 mx-1" />
            </div>

            {/* Input Field */}
            <div className="flex-1 relative group/input">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening..." : "Command Nova OS..."}
                disabled={isProcessing}
                className="w-full bg-transparent border-none pl-3 pr-12 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <AnimatePresence>
                  {inputText.trim() && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => handleSend()}
                      className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-all mr-1"
                    >
                      <Send size={14} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Main Action Button (Orb/Mic) */}
            <div className="pr-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 relative overflow-hidden group ${
                  isListening 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="relative z-10 flex items-center gap-3">
                  {isListening ? (
                    <>
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ height: [6, 12, 6] }}
                            transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                            className="w-0.5 bg-red-400"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">End Session</span>
                    </>
                  ) : (
                    <>
                      <Mic size={18} className="text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Start Voice</span>
                    </>
                  )}
                </div>
              </motion.button>
            </div>
          </div>

          {/* Quick Shortcuts Hint */}
          <div className="mt-5 flex justify-center gap-6 text-[9px] font-bold text-slate-600 uppercase tracking-[0.25em]">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded border border-white/5 bg-white/2">Space</span>
              <span>Hold to Talk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded border border-white/5 bg-white/2">Esc</span>
              <span>Stop AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
