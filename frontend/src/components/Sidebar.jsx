import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, BrainCircuit, Trash2, Calendar, Sparkles } from 'lucide-react';
import { patchTodo, deleteTodoApi, deleteMemoryApi, fetchTodos, fetchMemories } from '../services/api';

export default function Sidebar() {
  const { todos, memories, setTodos, setMemories, optimisticToggleTodo, optimisticDeleteTodo, addToast } = useAppStore();

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
      addToast('Update failed', 'error');
    }
  };

  const handleDelete = async (todo) => {
    optimisticDeleteTodo(todo.id);
    try {
      await deleteTodoApi(todo.id);
      await refresh();
    } catch {
      addToast('Delete failed', 'error');
      await refresh();
    }
  };

  const pending = todos.filter(t => !t.completed);

  return (
    <div className="w-80 h-full flex flex-col gap-6 flex-shrink-0">
      {/* Tasks Section */}
      <div className="flex-1 glass-panel rounded-3xl p-5 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={18} className="text-blue-400" />
            <h2 className="font-bold">Tasks</h2>
          </div>
          <span className="text-xs text-slate-500">{pending.length} Active</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-2 scrollbar-thin">
          {todos.map(todo => (
            <motion.div
              layout
              key={todo.id}
              className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 group"
            >
              <button onClick={() => handleToggle(todo)} className="mt-0.5">
                {todo.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-600" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{todo.task}</p>
                {todo.scheduled_time && <p className="text-[10px] text-slate-500 mt-1">{new Date(todo.scheduled_time).toLocaleString()}</p>}
              </div>
              <button onClick={() => handleDelete(todo)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Memory Section */}
      <div className="h-64 glass-panel rounded-3xl p-5 flex flex-col min-h-0">
        <div className="flex items-center gap-2 text-white mb-4">
          <BrainCircuit size={18} className="text-purple-400" />
          <h2 className="font-bold">Memory</h2>
        </div>
        <div className="overflow-y-auto flex-1 space-y-3 pr-2 scrollbar-thin">
          {memories.map(mem => (
            <div key={mem.id} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <p className="text-xs text-purple-200 italic">"{mem.content}"</p>
              <button onClick={() => deleteMemoryApi(mem.id).then(refresh)} className="text-[10px] text-slate-600 hover:text-red-400 mt-2">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
