import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, BrainCircuit, Trash2, 
  Layers, History, Zap, Shield, ChevronRight
} from 'lucide-react';
import { patchTodo, deleteTodoApi, deleteMemoryApi, fetchTodos, fetchMemories } from '../services/api';

export default function Sidebar() {
  const { 
    todos, memories, setTodos, setMemories, 
    optimisticToggleTodo, optimisticDeleteTodo, addToast 
  } = useAppStore();

  const refresh = async () => {
    try {
      const [t, m] = await Promise.all([fetchTodos(), fetchMemories()]);
      setTodos(t);
      setMemories(m);
    } catch (_) {}
  };

  const handleToggle = async (todo) => {
    optimisticToggleTodo(todo.id);
    try {
      await patchTodo(todo.id, { completed: !todo.completed });
      await refresh();
    } catch {
      optimisticToggleTodo(todo.id);
      addToast('Sync failed', 'error');
    }
  };

  const handleDelete = async (todo) => {
    optimisticDeleteTodo(todo.id);
    try {
      await deleteTodoApi(todo.id);
      await refresh();
    } catch {
      addToast('Purge failed', 'error');
      await refresh();
    }
  };

  const pendingCount = todos.filter(t => !t.completed).length;

  return (
    <div className="sidebar-container">
      {/* Task Section */}
      <section className="sidebar-section glass">
        <div className="sidebar-header">
          <div className="header-title">
            <Layers size={18} className="text-blue-400" />
            <h3 className="font-display">Task Queue</h3>
          </div>
          <span className="badge">{pendingCount} Active</span>
        </div>

        <div className="sidebar-content">
          <AnimatePresence mode="popLayout">
            {todos.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={32} />} text="Queue Clear" />
            ) : (
              todos.map((todo, idx) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`task-item glass-card ${todo.completed ? 'completed' : ''}`}
                >
                  <button className="check-btn" onClick={() => handleToggle(todo)}>
                    {todo.completed ? <CheckCircle2 size={16} /> : <div className="dot" />}
                  </button>
                  <span className="task-text">{todo.task}</span>
                  <button className="delete-btn" onClick={() => handleDelete(todo)}>
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Memory Section */}
      <section className="sidebar-section glass">
        <div className="sidebar-header">
          <div className="header-title">
            <BrainCircuit size={18} className="text-purple-400" />
            <h3 className="font-display">Semantic Core</h3>
          </div>
        </div>

        <div className="sidebar-content">
          <AnimatePresence mode="popLayout">
            {memories.length === 0 ? (
              <EmptyState icon={<History size={32} />} text="No Memories" />
            ) : (
              memories.map((mem, idx) => (
                <motion.div 
                  key={mem.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="memory-item glass-card"
                >
                  <div className="memory-indicator" />
                  <p className="memory-text">{mem.content}</p>
                  <button 
                    className="memory-purge"
                    onClick={() => deleteMemoryApi(mem.id).then(refresh)}
                  >
                    Purge
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          opacity: 0.2;
          gap: 12px;
        }
        .empty-icon {
          color: var(--text-primary);
        }
        p {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
      `}</style>
    </div>
  );
}
