import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />,
  error:   <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />,
  info:    <Info         size={16} className="text-blue-400 flex-shrink-0" />,
};

const COLORS = {
  success: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100',
  warning: 'bg-amber-950/80 border-amber-500/30 text-amber-100',
  error:   'bg-red-950/80 border-red-500/30 text-red-100',
  info:    'bg-blue-950/80 border-blue-500/30 text-blue-100',
};

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1   }}
            exit={{   opacity: 0, x: 60,  scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl
              border backdrop-blur-md shadow-2xl min-w-[260px] max-w-[360px]
              ${COLORS[toast.type] || COLORS.info}
            `}
          >
            {ICONS[toast.type] || ICONS.info}
            <p className="text-sm flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-50 hover:opacity-100 transition-opacity ml-1 mt-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
