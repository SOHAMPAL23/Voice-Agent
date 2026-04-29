import { create } from 'zustand';

let toastId = 0;

export const useAppStore = create((set, get) => ({
  // ─── Data ────────────────────────────────────────────────────────────────
  todos:      [],
  memories:   [],
  chatHistory: [],

  // ─── UI state ────────────────────────────────────────────────────────────
  isListening:  false,
  isProcessing: false,
  toasts:       [],

  // ─── Setters ─────────────────────────────────────────────────────────────
  setTodos:       (todos)    => set({ todos }),
  setMemories:    (memories) => set({ memories }),
  setIsListening: (v)        => set({ isListening: v }),
  setIsProcessing:(v)        => set({ isProcessing: v }),

  addChatMessage: (msg) => set((state) => ({
    chatHistory: [...state.chatHistory, { ...msg, id: crypto.randomUUID() }],
  })),

  // ─── Optimistic todo updates ──────────────────────────────────────────────
  optimisticToggleTodo: (id) => set((state) => ({
    todos: state.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ),
  })),

  optimisticDeleteTodo: (id) => set((state) => ({
    todos: state.todos.filter((t) => t.id !== id),
  })),

  // ─── Toast system ─────────────────────────────────────────────────────────
  addToast: (message, type = 'success') => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // ─── AI Interaction ───────────────────────────────────────────────────────
  sendToNova: async (text) => {
    const { chatHistory, addChatMessage, setIsProcessing, setTodos, setMemories } = get();
    if (!text.trim()) return;

    addChatMessage({ role: 'user', content: text });
    setIsProcessing(true);

    try {
      const { sendChatMessage, fetchTodos, fetchMemories } = await import('../services/api');
      const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(text, history);
      
      addChatMessage({ role: 'agent', content: res.response });
      
      // Auto-refresh data after AI turn
      const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
      set({ todos: t, memories: m });
    } catch (err) {
      console.error(err);
      addChatMessage({ role: 'system', content: `Error: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  },

  sendAudioToNova: async (audioBlob, transcript = '') => {
    const { chatHistory, addChatMessage, setIsProcessing, setTodos, setMemories } = get();
    setIsProcessing(true);

    try {
      const { sendAudioMessage, fetchTodos, fetchMemories } = await import('../services/api');
      const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await sendAudioMessage(audioBlob, transcript, history);
      
      addChatMessage({ role: 'agent', content: res.response });
      
      const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
      set({ todos: t, memories: m });
    } catch (err) {
      console.error(err);
      addChatMessage({ role: 'system', content: `Voice Error: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  },
}));
