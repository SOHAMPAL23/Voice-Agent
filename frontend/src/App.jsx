import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Settings, Activity, MessageSquare, 
  Database, Shield, Cpu, Mic, Volume2,
  Terminal, BarChart3, Clock, LayoutDashboard,
  Waves, Loader2, User, Bot, AlertTriangle
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { fetchTodos, fetchMemories, checkHealth } from './services/api';
import { useVoice } from './hooks/useVoice';
import { useTTS } from './hooks/useTTS';

// Components
import TranscriptView from './components/TranscriptView';
import Sidebar from './components/Sidebar';
import VoiceOrb from './components/ui/VoiceOrb';
import ChatInterface from './components/ChatInterface';
import AnalyticsView from './components/AnalyticsView';
import MemoriesView from './components/MemoriesView';

function App() {
  const { setTodos, setMemories, chatHistory, isProcessing } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOffline, setIsOffline] = useState(false);

  // Interaction Hooks
  const { isListening, startListening, stopListening, analyser } = useVoice();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const { isMuted } = useAppStore();

  // Watch for new AI messages to speak them
  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'agent' && !isSpeaking && !isMuted) {
      speak(lastMsg.content);
    }
  }, [chatHistory, speak, isSpeaking, isMuted]);

  // Unified state for visual components
  const aiState = React.useMemo(() => {
    if (isListening) return 'listening';
    if (isProcessing) return 'thinking';
    if (isSpeaking) return 'speaking';
    return 'idle';
  }, [isListening, isProcessing, isSpeaking]);

  useEffect(() => {
    const init = async () => {
      try {
        await checkHealth();
        const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
        setTodos(t);
        setMemories(m);
        setIsOffline(false);
      } catch (err) {
        console.error("Initialization failed:", err);
        setIsOffline(true);
      } finally {
        setTimeout(() => setIsInitializing(false), 1500);
      }
    };
    init();
  }, [setTodos, setMemories]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="content-grid">
            {/* Voice Interaction Core */}
            <section className="voice-core glass">
              <div className="w-full h-80 relative flex items-center justify-center">
                <VoiceOrb state={aiState} analyser={analyser} />
              </div>
              <div className="voice-controls">
                <button 
                  className={`mic-button ${isListening ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : isListening ? (
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, 12, 4] }}
                          transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                          className="w-1 bg-white rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <Mic size={24} />
                  )}
                </button>
                <p className="voice-status">
                  {isProcessing ? 'Nova is thinking...' : isListening ? 'Listening to your command...' : 'System ready. Click to speak.'}
                </p>
              </div>
            </section>

            {/* Transcript Feed */}
            <section className="transcript-section glass">
              <div className="section-header">
                <Terminal size={16} className="text-blue-400" />
                <h3 className="uppercase tracking-widest text-[10px] font-bold">Real-time Stream</h3>
              </div>
              <TranscriptView />
            </section>
          </div>
        );
      
      case 'chat':
        return (
          <div className="full-view glass">
            <ChatInterface />
          </div>
        );

      case 'memories':
        return (
          <div className="full-view glass overflow-hidden flex flex-col">
            <MemoriesView />
          </div>
        );

      case 'analytics':
        return (
          <div className="full-view glass overflow-hidden flex flex-col">
            <AnalyticsView />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="main-container">
      <div className="bg-mesh" />
      
      <AnimatePresence>
        {isInitializing ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0, scale: 0.9 }}
            className="loader-screen"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="loader-content"
            >
              <div className="loader-orb" />
              <h2 className="font-display tracking-[0.4em] uppercase text-xs mt-8 text-blue-400">Nova Intelligence</h2>
              <div className="loader-bar-container">
                <motion.div 
                  className="loader-bar"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="app-layout"
          >
            {/* Left Sidebar - Navigation */}
            <nav className="nav-sidebar glass">
              <div className="logo-section">
                <div className="logo-icon">
                  <Zap size={20} fill="currentColor" />
                </div>
                <span className="logo-text">NOVA</span>
              </div>
              
              <div className="nav-items">
                <NavItem 
                  icon={<LayoutDashboard size={20} />} 
                  label="Dashboard"
                  active={activeTab === 'dashboard'} 
                  onClick={() => setActiveTab('dashboard')}
                />
                <NavItem 
                  icon={<MessageSquare size={20} />} 
                  label="Chat"
                  active={activeTab === 'chat'} 
                  onClick={() => setActiveTab('chat')}
                />
                <NavItem 
                  icon={<Database size={20} />} 
                  label="Memories"
                  active={activeTab === 'memories'} 
                  onClick={() => setActiveTab('memories')}
                />
                <NavItem 
                  icon={<BarChart3 size={20} />} 
                  label="Analytics"
                  active={activeTab === 'analytics'} 
                  onClick={() => setActiveTab('analytics')}
                />
              </div>

              <div className="nav-footer">
                <NavItem icon={<Settings size={20} />} label="Settings" />
              </div>
            </nav>

            {/* Main Workspace */}
            <main className="workspace">
              {/* Header */}
              <header className="workspace-header">
                <div className="header-info">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    <h1 className="font-display text-2xl font-bold tracking-tight capitalize">{activeTab}</h1>
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    Neural Engine Status: 
                    {isOffline ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertTriangle size={10} /> Disconnected
                      </span>
                    ) : (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> Synchronized
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="header-actions">
                  <div className="system-stats bg-white/2 border border-white/5 backdrop-blur-md px-5 py-2 rounded-2xl flex gap-6">
                    <StatItem icon={<Activity size={12} className="text-cyan-400" />} label="LAT" value="12ms" />
                    <StatItem icon={<Cpu size={12} className="text-indigo-400" />} label="NPU" value="24%" />
                    <StatItem icon={<Database size={12} className="text-purple-400" />} label="RAM" value="1.2GB" />
                  </div>
                </div>
              </header>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Right Sidebar - Intel (Only on Dashboard) */}
            {activeTab === 'dashboard' && (
              <aside className="intel-sidebar">
                <Sidebar />
              </aside>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx="true">{`
        .full-view {
          flex: 1;
          border-radius: 24px;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .nav-item {
          position: relative;
          group: hover;
        }

        .nav-label {
          position: absolute;
          left: 100%;
          margin-left: 12px;
          padding: 6px 10px;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-primary);
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: var(--transition-smooth);
          transform: translateX(-10px);
          z-index: 100;
        }

        .nav-item:hover .nav-label {
          opacity: 1;
          transform: translateX(0);
        }

        .mic-button.processing {
          background: var(--bg-surface-elevated);
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      {label && <span className="nav-label">{label}</span>}
    </div>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="stat-item">
      <span className="opacity-50">{icon}</span>
      <span className="uppercase tracking-tighter text-[9px] opacity-40">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default App;
