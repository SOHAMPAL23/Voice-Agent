import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { fetchTodos, fetchMemories, checkHealth } from './services/api';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { BotMessageSquare, Sparkles, WifiOff } from 'lucide-react';

function App() {
  const { setTodos, setMemories, toasts } = useAppStore();
  const [backendOk, setBackendOk] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await checkHealth();
        const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
        setTodos(t);
        setMemories(m);
        setBackendOk(true);
      } catch (err) {
        console.error("Initialization failed:", err);
        setBackendOk(false);
      }
    };
    init();
  }, [setTodos, setMemories]);

  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="min-h-screen p-5 md:p-7 flex flex-col items-center">

      {/* Header */}
      <div className="w-full max-w-6xl mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-blue-600/20 ring-1 ring-blue-500/30">
            <BotMessageSquare size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">
              Nova Agent
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{date}</p>
          </div>
        </div>

        {!backendOk && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full animate-pulse">
            <WifiOff size={12} />
            Backend Offline
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="w-full max-w-6xl flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        <ChatInterface />
        <Sidebar />
      </main>
    </div>
  );
}

export default App;
